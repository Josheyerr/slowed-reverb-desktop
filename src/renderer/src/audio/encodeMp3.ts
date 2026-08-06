/* eslint-disable @typescript-eslint/no-explicit-any */
import { encodeWav } from './encodeWav'

/**
 * MP3 encode via lamejs. Falls back to WAV if lamejs is unavailable.
 * Returns { data, extension }.
 */
export const encodeMp3 = async (
  buffer: AudioBuffer
): Promise<{ data: ArrayBuffer; extension: 'mp3' | 'wav' }> => {
  try {
    // lamejs has awkward CJS exports
    const lamejs = await import('lamejs')
    const Mp3Encoder =
      (lamejs as any).Mp3Encoder || (lamejs as any).default?.Mp3Encoder
    if (!Mp3Encoder) {
      return { data: encodeWav(buffer), extension: 'wav' }
    }

    const numChannels = Math.min(2, buffer.numberOfChannels)
    const sampleRate = buffer.sampleRate
    const encoder = new Mp3Encoder(numChannels, sampleRate, 192)
    const left = floatTo16BitPCM(buffer.getChannelData(0))
    const right =
      numChannels > 1
        ? floatTo16BitPCM(buffer.getChannelData(1))
        : left

    const blockSize = 1152
    const parts: Uint8Array[] = []
    for (let i = 0; i < left.length; i += blockSize) {
      const leftChunk = left.subarray(i, i + blockSize)
      const rightChunk = right.subarray(i, i + blockSize)
      const mp3buf =
        numChannels === 1
          ? encoder.encodeBuffer(leftChunk)
          : encoder.encodeBuffer(leftChunk, rightChunk)
      if (mp3buf.length > 0) parts.push(new Uint8Array(mp3buf))
    }
    const end = encoder.flush()
    if (end.length > 0) parts.push(new Uint8Array(end))

    const total = parts.reduce((n, p) => n + p.length, 0)
    const out = new Uint8Array(total)
    let offset = 0
    for (const part of parts) {
      out.set(part, offset)
      offset += part.length
    }
    return { data: out.buffer, extension: 'mp3' }
  } catch {
    return { data: encodeWav(buffer), extension: 'wav' }
  }
}

const floatTo16BitPCM = (input: Float32Array): Int16Array => {
  const output = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return output
}
