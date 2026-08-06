import { getExtension, isChromeFastPath } from '@shared/audioFormats'

export const decodeAudioData = async (
  ctx: BaseAudioContext,
  arrayBuffer: ArrayBuffer
): Promise<AudioBuffer> => {
  // decodeAudioData detaches the buffer in some engines — copy first
  const copy = arrayBuffer.slice(0)
  return ctx.decodeAudioData(copy)
}

/**
 * Chromium-first decode; falls back to main-process ffmpeg → PCM WAV.
 * `filePath` should be a real filesystem path when using Electron (for ffmpeg).
 * For blob: URLs, pass the ArrayBuffer and optional name for extension hints.
 */
export const decodeAudioFlexible = async (
  ctx: BaseAudioContext,
  options: {
    arrayBuffer?: ArrayBuffer
    filePath?: string
    displayName?: string
  }
): Promise<AudioBuffer> => {
  const { filePath, displayName } = options
  let { arrayBuffer } = options

  const pathForExt = displayName || filePath || ''
  const preferChrome = !filePath || isChromeFastPath(pathForExt)

  const tryChrome = async (buf: ArrayBuffer): Promise<AudioBuffer | null> => {
    try {
      return await decodeAudioData(ctx, buf)
    } catch {
      return null
    }
  }

  if (preferChrome) {
    if (!arrayBuffer) {
      if (!filePath || !window.electronAPI) {
        throw new Error('No audio data to decode')
      }
      arrayBuffer = await window.electronAPI.readFile(filePath)
    }
    const chromeBuf = await tryChrome(arrayBuffer)
    if (chromeBuf) return chromeBuf
  } else if (arrayBuffer) {
    const chromeBuf = await tryChrome(arrayBuffer)
    if (chromeBuf) return chromeBuf
  }

  // ffmpeg fallback (Electron only)
  if (!window.electronAPI) {
    throw new Error(
      'This format is not supported in the browser preview. Use the desktop app.'
    )
  }

  let wavBuffer: ArrayBuffer
  try {
    if (filePath && !filePath.startsWith('blob:')) {
      wavBuffer = await window.electronAPI.decodeToWav(filePath)
    } else {
      if (!arrayBuffer) {
        throw new Error('No audio bytes available for ffmpeg decode')
      }
      const ext = getExtension(pathForExt) || 'bin'
      wavBuffer = await window.electronAPI.decodeBufferToWav(arrayBuffer, ext)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Could not decode audio (${pathForExt || 'file'}). ${message}`
    )
  }

  try {
    return await decodeAudioData(ctx, wavBuffer)
  } catch {
    throw new Error(
      `ffmpeg produced an unreadable WAV for ${pathForExt || 'file'}`
    )
  }
}

export const extractPeaks = (
  buffer: AudioBuffer,
  buckets = 512
): Float32Array => {
  const peaks = new Float32Array(buckets)
  const channel = buffer.getChannelData(0)
  const blockSize = Math.floor(channel.length / buckets) || 1
  for (let i = 0; i < buckets; i++) {
    const start = i * blockSize
    let max = 0
    for (let j = 0; j < blockSize && start + j < channel.length; j++) {
      const v = Math.abs(channel[start + j])
      if (v > max) max = v
    }
    peaks[i] = max
  }
  return peaks
}

export const basename = (filePath: string): string => {
  const parts = filePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || filePath
}
