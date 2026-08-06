import type { EqBand, RemixSettings } from './types'

export const CHANNEL_COUNT = 2

/** Extension defaults — keep in sync with content-scripts/initialize.js */
export const DEFAULT_DECAY_SECONDS = 5
export const DEFAULT_PRE_DELAY_SECONDS = 0.01

export const MIN_PLAYBACK_RATE = 0.5
export const MAX_PLAYBACK_RATE = 1.5
export const MIN_REVERB_WET_MIX = 0
export const MAX_REVERB_WET_MIX = 1
export const MIN_LOW_BAND_DECIBELS = 0
export const MAX_LOW_BAND_DECIBELS = 10

export const BASS_SHELF_FREQUENCY_HZ = 160

export const MIN_DECAY_SECONDS = 0.5
export const MAX_DECAY_SECONDS = 10
export const MIN_PRE_DELAY_SECONDS = 0
export const MAX_PRE_DELAY_SECONDS = 0.1

export const MIN_PITCH_SEMITONES = -12
export const MAX_PITCH_SEMITONES = 12

export const DEFAULT_EQ_BANDS: EqBand[] = [
  { id: 'low', type: 'lowshelf', frequency: 80, gain: 0, Q: 0.7 },
  { id: 'lowmid', type: 'peaking', frequency: 400, gain: 0, Q: 1 },
  { id: 'highmid', type: 'peaking', frequency: 2500, gain: 0, Q: 1 },
  { id: 'high', type: 'highshelf', frequency: 8000, gain: 0, Q: 0.7 }
]

export const PRESETS: Record<string, RemixSettings> = {
  slowedandreverb: {
    playbackRate: 0.8,
    reverbWetMix: 0.4,
    lowBandDecibels: 0,
    preservesPitch: false,
    decaySeconds: DEFAULT_DECAY_SECONDS,
    preDelaySeconds: DEFAULT_PRE_DELAY_SECONDS,
    pitchSemitones: 0,
    eqBands: DEFAULT_EQ_BANDS.map((b) => ({ ...b }))
  },
  nightcore: {
    playbackRate: 1.2,
    reverbWetMix: 0,
    lowBandDecibels: 0,
    preservesPitch: false,
    decaySeconds: DEFAULT_DECAY_SECONDS,
    preDelaySeconds: DEFAULT_PRE_DELAY_SECONDS,
    pitchSemitones: 0,
    eqBands: DEFAULT_EQ_BANDS.map((b) => ({ ...b }))
  },
  off: {
    playbackRate: 1,
    reverbWetMix: 0,
    lowBandDecibels: 0,
    preservesPitch: false,
    decaySeconds: DEFAULT_DECAY_SECONDS,
    preDelaySeconds: DEFAULT_PRE_DELAY_SECONDS,
    pitchSemitones: 0,
    eqBands: DEFAULT_EQ_BANDS.map((b) => ({ ...b }))
  }
}

export const DEFAULT_SETTINGS: RemixSettings = {
  ...PRESETS.slowedandreverb,
  eqBands: DEFAULT_EQ_BANDS.map((b) => ({ ...b }))
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export const clampRemixSettings = (settings: RemixSettings): RemixSettings => ({
  playbackRate: clamp(settings.playbackRate, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE),
  reverbWetMix: clamp(settings.reverbWetMix, MIN_REVERB_WET_MIX, MAX_REVERB_WET_MIX),
  lowBandDecibels: clamp(
    settings.lowBandDecibels,
    MIN_LOW_BAND_DECIBELS,
    MAX_LOW_BAND_DECIBELS
  ),
  preservesPitch: Boolean(settings.preservesPitch),
  decaySeconds: clamp(settings.decaySeconds, MIN_DECAY_SECONDS, MAX_DECAY_SECONDS),
  preDelaySeconds: clamp(
    settings.preDelaySeconds,
    MIN_PRE_DELAY_SECONDS,
    MAX_PRE_DELAY_SECONDS
  ),
  pitchSemitones: clamp(
    settings.pitchSemitones,
    MIN_PITCH_SEMITONES,
    MAX_PITCH_SEMITONES
  ),
  eqBands: settings.eqBands.map((band) => ({
    ...band,
    gain: clamp(band.gain, -12, 12),
    frequency: clamp(band.frequency, 20, 20000),
    Q: clamp(band.Q, 0.1, 10)
  }))
})
