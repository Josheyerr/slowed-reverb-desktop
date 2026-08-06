import type { CustomPreset, RemixSettings } from './dsp/types'
import { PRESETS } from './dsp/constants'

export type BuiltinPresetId = keyof typeof PRESETS

export const builtinPresetList: { id: BuiltinPresetId; name: string }[] = [
  { id: 'slowedandreverb', name: 'Slowed + Reverb' },
  { id: 'nightcore', name: 'Nightcore' },
  { id: 'off', name: 'Off' }
]

export const getBuiltinPreset = (id: BuiltinPresetId): RemixSettings => {
  const preset = PRESETS[id]
  return {
    ...preset,
    eqBands: preset.eqBands.map((b) => ({ ...b }))
  }
}

export const createCustomPreset = (
  name: string,
  settings: RemixSettings,
  key = crypto.randomUUID()
): CustomPreset => ({
  key,
  name,
  ...settings,
  eqBands: settings.eqBands.map((b) => ({ ...b }))
})
