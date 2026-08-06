import { create } from 'zustand'
import {
  DEFAULT_SETTINGS,
  clampRemixSettings,
  type CustomPreset,
  type RemixSettings
} from '@shared/dsp'
import { getBuiltinPreset, type BuiltinPresetId } from '@shared/presets'

export type LibraryTrack = {
  id: string
  path: string
  name: string
  peaks: Float32Array | null
  duration: number
  loading: boolean
}

export type BatchJob = {
  trackId: string
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
}

export type ExportProgress = {
  active: boolean
  label: string
  progress: number
} | null

type AppState = {
  settings: RemixSettings
  abBypass: boolean
  activePresetId: string | null
  customPresets: CustomPreset[]
  tracks: LibraryTrack[]
  activeTrackId: string | null
  isPlaying: boolean
  currentTime: number
  batchQueue: BatchJob[]
  exportProgress: ExportProgress

  setSettings: (partial: Partial<RemixSettings>) => void
  replaceSettings: (settings: RemixSettings) => void
  applyBuiltinPreset: (id: BuiltinPresetId) => void
  setAbBypass: (v: boolean) => void
  setCustomPresets: (presets: CustomPreset[]) => void
  upsertCustomPreset: (preset: CustomPreset) => void
  deleteCustomPreset: (key: string) => void
  applyCustomPreset: (key: string) => void

  addTracks: (tracks: LibraryTrack[]) => void
  updateTrack: (id: string, patch: Partial<LibraryTrack>) => void
  removeTrack: (id: string) => void
  setActiveTrack: (id: string | null) => void
  setPlaying: (v: boolean) => void
  setCurrentTime: (t: number) => void

  setBatchQueue: (jobs: BatchJob[]) => void
  setExportProgress: (p: ExportProgress) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS, eqBands: DEFAULT_SETTINGS.eqBands.map((b) => ({ ...b })) },
  abBypass: false,
  activePresetId: 'slowedandreverb',
  customPresets: [],
  tracks: [],
  activeTrackId: null,
  isPlaying: false,
  currentTime: 0,
  batchQueue: [],
  exportProgress: null,

  setSettings: (partial) => {
    const next = clampRemixSettings({ ...get().settings, ...partial })
    set({ settings: next, activePresetId: null })
  },

  replaceSettings: (settings) => {
    set({
      settings: clampRemixSettings(settings),
      activePresetId: null
    })
  },

  applyBuiltinPreset: (id) => {
    set({
      settings: getBuiltinPreset(id),
      activePresetId: id
    })
  },

  setAbBypass: (v) => set({ abBypass: v }),

  setCustomPresets: (presets) => set({ customPresets: presets }),

  upsertCustomPreset: (preset) => {
    const list = get().customPresets.filter((p) => p.key !== preset.key)
    const next = [...list, preset]
    set({ customPresets: next, activePresetId: preset.key })
    void window.electronAPI?.savePresets(next)
  },

  deleteCustomPreset: (key) => {
    const next = get().customPresets.filter((p) => p.key !== key)
    const activePresetId =
      get().activePresetId === key ? null : get().activePresetId
    set({ customPresets: next, activePresetId })
    void window.electronAPI?.savePresets(next)
  },

  applyCustomPreset: (key) => {
    const preset = get().customPresets.find((p) => p.key === key)
    if (!preset) return
    const { key: _k, name: _n, ...settings } = preset
    set({
      settings: clampRemixSettings(settings as RemixSettings),
      activePresetId: key
    })
  },

  addTracks: (tracks) => {
    set((s) => ({
      tracks: [...s.tracks, ...tracks],
      activeTrackId: s.activeTrackId ?? tracks[0]?.id ?? null
    }))
  },

  updateTrack: (id, patch) => {
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t))
    }))
  },

  removeTrack: (id) => {
    set((s) => {
      const tracks = s.tracks.filter((t) => t.id !== id)
      const activeTrackId =
        s.activeTrackId === id ? tracks[0]?.id ?? null : s.activeTrackId
      return { tracks, activeTrackId }
    })
  },

  setActiveTrack: (id) => set({ activeTrackId: id, currentTime: 0 }),
  setPlaying: (v) => set({ isPlaying: v }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setBatchQueue: (jobs) => set({ batchQueue: jobs }),
  setExportProgress: (p) => set({ exportProgress: p })
}))
