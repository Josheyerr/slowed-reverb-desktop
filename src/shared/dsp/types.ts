export type EqFilterType = 'lowshelf' | 'peaking' | 'highshelf'

export type EqBand = {
  id: string
  type: EqFilterType
  frequency: number
  gain: number
  Q: number
}

export type RemixSettings = {
  playbackRate: number
  reverbWetMix: number
  lowBandDecibels: number
  preservesPitch: boolean
  decaySeconds: number
  preDelaySeconds: number
  pitchSemitones: number
  eqBands: EqBand[]
}

export type EffectGraph = {
  input: AudioNode
  bassFilter: BiquadFilterNode
  eqFilters: BiquadFilterNode[]
  dryGain: GainNode
  wetInput: GainNode
  wetGain: GainNode
  convolver: ConvolverNode
  output: AudioNode
  dispose: () => void
}

export type CustomPreset = RemixSettings & {
  key: string
  name: string
}
