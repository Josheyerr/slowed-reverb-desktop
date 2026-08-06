import { CHANNEL_COUNT } from './constants'

/**
 * Port of extension createWhiteNoiseBuffer + createConvolver IR generation.
 * White noise → gain envelope: 0 → 1 @ preDelay → ~0 @ decay+preDelay.
 */
export const createWhiteNoiseBuffer = (
  audioContext: BaseAudioContext,
  decaySeconds: number,
  preDelaySeconds: number
): AudioBuffer => {
  const buffer = audioContext.createBuffer(
    CHANNEL_COUNT,
    Math.ceil((decaySeconds + preDelaySeconds) * audioContext.sampleRate),
    audioContext.sampleRate
  )
  for (let channelNum = 0; channelNum < CHANNEL_COUNT; channelNum++) {
    const channelData = buffer.getChannelData(channelNum)
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.random() * 2 - 1
    }
  }
  return buffer
}

export const createImpulseResponse = async (
  audioContext: BaseAudioContext,
  decaySeconds: number,
  preDelaySeconds: number
): Promise<AudioBuffer> => {
  const length = Math.ceil((decaySeconds + preDelaySeconds) * audioContext.sampleRate)
  const offlineContext = new OfflineAudioContext(
    CHANNEL_COUNT,
    length,
    audioContext.sampleRate
  )
  const bufferSource = offlineContext.createBufferSource()
  bufferSource.buffer = createWhiteNoiseBuffer(
    offlineContext,
    decaySeconds,
    preDelaySeconds
  )
  const gain = offlineContext.createGain()
  gain.gain.setValueAtTime(0, 0)
  gain.gain.setValueAtTime(1, preDelaySeconds)
  gain.gain.exponentialRampToValueAtTime(
    0.00001,
    decaySeconds + preDelaySeconds
  )
  bufferSource.connect(gain)
  gain.connect(offlineContext.destination)
  bufferSource.start(0)
  return offlineContext.startRendering()
}

export const createConvolver = async (
  audioContext: BaseAudioContext,
  decaySeconds: number,
  preDelaySeconds: number
): Promise<ConvolverNode> => {
  const convolver = audioContext.createConvolver()
  convolver.buffer = await createImpulseResponse(
    audioContext,
    decaySeconds,
    preDelaySeconds
  )
  return convolver
}
