import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater, type UpdateInfo, type ProgressInfo } from 'electron-updater'
import type { UpdateState, UpdateStatus } from '../shared/update'

export type { UpdateState, UpdateStatus }

declare const __UPDATE_FEED_TOKEN__: string
declare const __UPDATE_OWNER__: string
declare const __UPDATE_REPO__: string

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000
const INITIAL_DELAY_MS = 4_000

let state: UpdateState = {
  status: 'idle',
  version: null,
  progress: null,
  error: null
}

let checkTimer: ReturnType<typeof setInterval> | null = null

function broadcast(channel: string, payload?: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

function setState(partial: Partial<UpdateState>): void {
  state = { ...state, ...partial }
  broadcast('updater:state', state)
}

export function getUpdateState(): UpdateState {
  return state
}

export function registerUpdaterIpc(): void {
  ipcMain.handle('updater:getVersion', () => app.getVersion())
  ipcMain.handle('updater:getState', () => state)
  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      setState({ status: 'not-available', error: null })
      return { ok: false, reason: 'dev' }
    }
    try {
      const result = await autoUpdater.checkForUpdates()
      return { ok: true, updateInfo: result?.updateInfo ?? null }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setState({ status: 'error', error: message })
      return { ok: false, reason: message }
    }
  })
  ipcMain.handle('updater:quitAndInstall', () => {
    autoUpdater.quitAndInstall(false, true)
    return true
  })
}

export function initAutoUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  const token =
    (typeof __UPDATE_FEED_TOKEN__ !== 'undefined' && __UPDATE_FEED_TOKEN__) ||
    process.env.UPDATE_FEED_TOKEN ||
    process.env.GH_TOKEN ||
    ''

  const owner =
    (typeof __UPDATE_OWNER__ !== 'undefined' && __UPDATE_OWNER__) ||
    process.env.UPDATE_OWNER ||
    'Josheyerr'
  const repo =
    (typeof __UPDATE_REPO__ !== 'undefined' && __UPDATE_REPO__) ||
    process.env.UPDATE_REPO ||
    'slowed-reverb-desktop'

  // Public GitHub Releases — token is optional (only needed if the repo is private).
  autoUpdater.setFeedURL({
    provider: 'github',
    owner,
    repo,
    private: false,
    ...(token ? { token } : {})
  })

  autoUpdater.on('checking-for-update', () => {
    setState({ status: 'checking', error: null })
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    setState({
      status: 'available',
      version: info.version,
      progress: 0,
      error: null
    })
  })

  autoUpdater.on('update-not-available', () => {
    setState({ status: 'not-available', version: null, progress: null, error: null })
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    setState({
      status: 'downloading',
      progress: Math.min(1, (progress.percent ?? 0) / 100),
      error: null
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    setState({
      status: 'downloaded',
      version: info.version,
      progress: 1,
      error: null
    })
  })

  autoUpdater.on('error', (err: Error) => {
    setState({
      status: 'error',
      error: err?.message || String(err)
    })
  })

  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch(() => undefined)
  }, INITIAL_DELAY_MS)

  checkTimer = setInterval(() => {
    void autoUpdater.checkForUpdates().catch(() => undefined)
  }, CHECK_INTERVAL_MS)

  app.on('will-quit', () => {
    if (checkTimer) clearInterval(checkTimer)
  })
}
