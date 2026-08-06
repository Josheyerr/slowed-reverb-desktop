import {
  applyRemixSettings,
  buildEffectGraph,
  type RemixSettings
} from '@shared/dsp'
import { encodeWav } from './encodeWav'
import { encodeMp3 } from './encodeMp3'

export type RenderFormat = 'wav' | 'mp3'

export type RenderProgress = {
  phase: 'processing' | 'encoding' | 'done'
  progress: number
}

/**
 * Offline render using the same effect graph as live preview.
 * When preservesPitch or pitchSemitones != 0, pre-processes with an
 * OfflineAudioContext + playbackRate/detune approximation, then effect graph.
 *
 * For true SoundTouch offline quality we resample in blocks via OfflineAudioContext
 * with rate adjustment. Extension-parity path (linked pitch): BufferSource.playbackRate.
 */
export const renderOffline = async (
  sourceBuffer: AudioBuffer,
  settings: RemixSettings,
  format: RenderFormat,
  onProgress?: (p: RenderProgress) => void
): Promise<{ data: ArrayBuffer; extension: string }> => {
  onProgress?.({ phase: 'processing', progress: 0.05 })

  const processed = await processWithEffects(sourceBuffer, settings, (p) => {
    onProgress?.({ phase: 'processing', progress: 0.05 + p * 0.7 })
  })

  onProgress?.({ phase: 'encoding', progress: 0.8 })

  if (format === 'mp3') {
    const result = await encodeMp3(processed)
    onProgress?.({ phase: 'done', progress: 1 })
    return result
  }

  const data = encodeWav(processed)
  onProgress?.({ phase: 'done', progress: 1 })
  return { data, extension: 'wav' }
}

const processWithEffects = async (
  sourceBuffer: AudioBuffer,
  settings: RemixSettings,
  onProgress?: (p: number) => void
): Promise<AudioBuffer> => {
  const needsTimeStretch =
    settings.preservesPitch || Math.abs(settings.pitchSemitones) > 0.001

  let inputBuffer = sourceBuffer
  let playbackRate = settings.playbackRate

  if (needsTimeStretch) {
    // Pre-render pitch/tempo via OfflineAudioContext + detune/rate split:
    // tempo via duration scaling, pitch via detune on a rate-compensated source
    inputBuffer = await renderPitchTempo(sourceBuffer, settings)
    playbackRate = 1
    onProgress?.(0.35)
  }

  const duration = inputBuffer.duration / playbackRate + settings.decaySeconds
  const sampleRate = inputBuffer.sampleRate
  const length = Math.ceil(duration * sampleRate)
  const offline = new OfflineAudioContext(
    inputBuffer.numberOfChannels,
    length,
    sampleRate
  )

  const graph = await buildEffectGraph(offline, settings)
  applyRemixSettings(graph, settings, false)

  const source = offline.createBufferSource()
  source.buffer = inputBuffer
  source.playbackRate.value = playbackRate
  source.connect(graph.input)
  graph.output.connect(offline.destination)
  source.start(0)

  onProgress?.(0.5)
  const rendered = await offline.startRendering()
  onProgress?.(1)
  graph.dispose()
  return rendered
}

/**
 * Approximate independent pitch + tempo for offline.
 * - preservesPitch: stretch duration by rate, keep pitch (playbackRate + inverse detune)
 * - pitchSemitones: additional detune
 */
const renderPitchTempo = async (
  buffer: AudioBuffer,
  settings: RemixSettings
): Promise<AudioBuffer> => {
  const tempo = settings.playbackRate
  const pitchRatio = Math.pow(2, settings.pitchSemitones / 12)

  // Output duration scales with tempo
  const outDuration = buffer.duration / tempo
  const length = Math.ceil(outDuration * buffer.sampleRate)
  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    length,
    buffer.sampleRate
  )

  const source = offline.createBufferSource()
  source.buffer = buffer

  if (settings.preservesPitch) {
    // Chromium preservesPitch equivalent: change speed without pitch
    // BufferSource can't do this natively — use playbackRate for tempo and
    // compensate pitch with detune (cents). Changing rate by R multiplies pitch
    // by R; detune by -1200*log2(R) restores pitch, then add pitchSemitones.
    source.playbackRate.value = tempo
    const compensateCents = -1200 * Math.log2(tempo)
    source.detune.value = compensateCents + settings.pitchSemitones * 100
  } else {
    // Linked rate already applied elsewhere; here only pitch offset at rate 1
    source.playbackRate.value = tempo * pitchRatio
  }

  source.connect(offline.destination)
  source.start(0)
  return offline.startRendering()
}
