import { spawn } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { basename, dirname, join } from 'path'
import { getFfmpegPath } from './ffmpegDecode'
import { downloadTikTokViaSsstik } from './tiktokSsstik'

export type MediaDownloadResult = {
  filePath: string
  title: string
}

const MEDIA_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com'
])

const TIKTOK_HOSTS = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com'
])

export const isSupportedMediaUrl = (raw: string): boolean => {
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    return MEDIA_HOSTS.has(u.hostname.toLowerCase())
  } catch {
    return false
  }
}

const isTikTokHost = (host: string): boolean => TIKTOK_HOSTS.has(host)

const getYtDlpPath = (): string => {
  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  const packaged = join(process.resourcesPath, 'yt-dlp', name)
  if (existsSync(packaged)) return packaged

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ytdl = require('youtube-dl-exec') as {
      constants?: { YOUTUBE_DL_PATH?: string }
    }
    const bin = (ytdl.constants?.YOUTUBE_DL_PATH || '').replace(
      /app\.asar(?!\.unpacked)/,
      'app.asar.unpacked'
    )
    if (bin && existsSync(bin)) return bin
  } catch {
    // fall through
  }

  const candidates = [
    join(__dirname, '../../../node_modules/youtube-dl-exec/bin', name),
    join(process.cwd(), 'node_modules/youtube-dl-exec/bin', name)
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }

  throw new Error('yt-dlp binary not found')
}

const runYtDlp = (args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const bin = getYtDlpPath()
    const child = spawn(bin, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', (err) => reject(err))
    child.on('close', (code) => {
      if (code === 0) resolve()
      else {
        const hint = stderr.split('\n').filter(Boolean).slice(-10).join('\n')
        reject(
          new Error(
            `yt-dlp failed (exit ${code})${hint ? `:\n${hint}` : ''}`
          )
        )
      }
    })
  })

const pickDownloadedFile = (dir: string): MediaDownloadResult => {
  const files = readdirSync(dir).filter(
    (f) => !f.endsWith('.part') && !f.endsWith('.ytdl')
  )
  if (!files.length) {
    throw new Error('Download finished but no audio file was produced')
  }
  const filePath = join(dir, files[0])
  const title = basename(filePath).replace(/\.[^.]+$/, '') || 'Imported audio'
  return { filePath, title }
}

/**
 * Download best audio from a YouTube or TikTok URL into a temp file.
 * YouTube uses yt-dlp; TikTok uses ssstik (no login / no yt-dlp).
 */
export const downloadMediaAudio = async (
  url: string
): Promise<MediaDownloadResult> => {
  const trimmed = url.trim()
  let host = ''
  try {
    host = new URL(trimmed).hostname.toLowerCase()
  } catch {
    host = 'invalid'
  }
  if (!isSupportedMediaUrl(trimmed)) {
    throw new Error('Only YouTube and TikTok URLs are supported')
  }

  const dir = await mkdtemp(join(tmpdir(), 'sr-yt-'))
  const ffmpegDir = dirname(getFfmpegPath())
  const outTemplate = join(dir, '%(title).200B.%(ext)s')

  if (isTikTokHost(host)) {
    return await downloadTikTokViaSsstik(trimmed, dir)
  }

  await runYtDlp([
    '--no-playlist',
    '--no-warnings',
    '-f',
    'ba/b',
    '-x',
    '--audio-format',
    'm4a',
    '--audio-quality',
    '0',
    '--ffmpeg-location',
    ffmpegDir,
    '-o',
    outTemplate,
    trimmed
  ])
  return pickDownloadedFile(dir)
}
