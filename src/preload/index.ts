import { contextBridge, ipcRenderer } from 'electron'
import type { CustomPreset } from '../shared/dsp/types'
import type { UpdateState } from '../shared/update'

export type { UpdateState, UpdateStatus } from '../shared/update'

export type ElectronAPI = {
  openAudioFiles: () => Promise<string[]>
  openDirectory: () => Promise<string | null>
  saveAudioFile: (defaultName: string) => Promise<string | null>
  readFile: (filePath: string) => Promise<ArrayBuffer>
  writeFile: (filePath: string, data: ArrayBuffer) => Promise<boolean>
  decodeToWav: (filePath: string) => Promise<ArrayBuffer>
  decodeBufferToWav: (
    data: ArrayBuffer,
    suggestedExt?: string
  ) => Promise<ArrayBuffer>
  importFromUrl: (
    url: string
  ) => Promise<{ filePath: string; title: string }>
  loadPresets: () => Promise<CustomPreset[]>
  savePresets: (presets: CustomPreset[]) => Promise<boolean>
  getPath: (name: 'userData' | 'downloads' | 'desktop') => Promise<string>
  getAppVersion: () => Promise<string>
  getUpdateState: () => Promise<UpdateState>
  checkForUpdates: () => Promise<{ ok: boolean; reason?: string }>
  quitAndInstall: () => Promise<boolean>
  onUpdateState: (cb: (state: UpdateState) => void) => () => void
}

const api: ElectronAPI = {
  openAudioFiles: () => ipcRenderer.invoke('dialog:openAudioFiles'),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveAudioFile: (defaultName) =>
    ipcRenderer.invoke('dialog:saveAudioFile', defaultName),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, data) =>
    ipcRenderer.invoke('fs:writeFile', filePath, data),
  decodeToWav: (filePath) => ipcRenderer.invoke('audio:decodeToWav', filePath),
  decodeBufferToWav: (data, suggestedExt) =>
    ipcRenderer.invoke('audio:decodeBufferToWav', data, suggestedExt),
  importFromUrl: (url) => ipcRenderer.invoke('youtube:importFromUrl', url),
  loadPresets: () => ipcRenderer.invoke('presets:load'),
  savePresets: (presets) => ipcRenderer.invoke('presets:save', presets),
  getPath: (name) => ipcRenderer.invoke('app:getPath', name),
  getAppVersion: () => ipcRenderer.invoke('updater:getVersion'),
  getUpdateState: () => ipcRenderer.invoke('updater:getState'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
  onUpdateState: (cb) => {
    const listener = (_event: Electron.IpcRendererEvent, state: UpdateState) => {
      cb(state)
    }
    ipcRenderer.on('updater:state', listener)
    return () => {
      ipcRenderer.removeListener('updater:state', listener)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
