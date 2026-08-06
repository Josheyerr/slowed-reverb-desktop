import { spawn } from 'child_process'
import { mkdtemp, readFile, rm, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'

export const getFfmpegPath = (): string => {
  // Packaged: binary copied to resources/ffmpeg/
  const packaged = join(
    process.resourcesPath,
    'ffmpeg',
    process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  )
  if (existsSync(packaged)) {
    return packaged
  }

  // Dev: resolve from ffmpeg-static (externalized dependency)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require('ffmpeg-static') as string | null
    if (ffmpegStatic && existsSync(ffmpegStatic)) {
      return ffmpegStatic.replace('app.asar', 'app.asar.unpacked')
    }
  } catch {
    // package missing in some packaged layouts
  }

  throw new Error('ffmpeg binary not found')
}

const runFfmpeg = (args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const bin = getFfmpegPath()
    const child = spawn(bin, args, {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe']
    })
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', (err) => reject(err))
    child.on('close', (code) => {
      if (code === 0) resolve()
      else {
        const hint = stderr.split('\n').filter(Boolean).slice(-8).join('\n')
        reject(
          new Error(
            `ffmpeg failed (exit ${code})${hint ? `:\n${hint}` : ''}`
          )
        )
      }
    })
  })

export type DecodeToWavResult = {
  data: ArrayBuffer
  /** Original error message if any intermediate step failed (for logging). */
}

/**
 * Transcode any ffmpeg-readable media to PCM float WAV bytes.
 * Accepts a filesystem path, or raw bytes written to a temp input file.
 */
export const decodeFileToWavBuffer = async (
  inputPath: string
): Promise<ArrayBuffer> => {
  const dir = await mkdtemp(join(tmpdir(), 'sr-decode-'))
  const outPath = join(dir, 'out.wav')
  try {
    await runFfmpeg([
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-sn',
      '-dn',
      '-acodec',
      'pcm_f32le',
      '-f',
      'wav',
      outPath
    ])
    const buf = await readFile(outPath)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  } finally {
    try {
      await unlink(outPath)
    } catch {
      // ignore
    }
    try {
      await rm(dir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
}

/**
 * When the renderer only has bytes (e.g. blob), write temp input then decode.
 */
export const decodeBufferToWavBuffer = async (
  input: ArrayBuffer,
  suggestedExt = 'bin'
): Promise<ArrayBuffer> => {
  const dir = await mkdtemp(join(tmpdir(), 'sr-decode-'))
  const inPath = join(dir, `in.${suggestedExt.replace(/^\./, '') || 'bin'}`)
  try {
    await writeFile(inPath, Buffer.from(input))
    return await decodeFileToWavBuffer(inPath)
  } finally {
    try {
      await unlink(inPath)
    } catch {
      // ignore
    }
    try {
      await rm(dir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
}
