import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { AUDIO_EXTENSIONS_UNIQUE } from '../shared/audioFormats'
import {
  decodeBufferToWavBuffer,
  decodeFileToWavBuffer
} from './audio/ffmpegDecode'
import { downloadMediaAudio } from './audio/youtubeDownload'
import { initAutoUpdater, registerUpdaterIpc } from './updater'

const PRESETS_FILE = 'custom-presets.json'

const isDev = !app.isPackaged

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#0a0a0c',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0c',
      symbolColor: '#e8e6f0',
      height: 36
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function presetsPath(): string {
  return join(app.getPath('userData'), PRESETS_FILE)
}

function registerIpc(): void {
  ipcMain.handle('dialog:openAudioFiles', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import audio',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Audio',
          extensions: AUDIO_EXTENSIONS_UNIQUE
        },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (result.canceled) return []
    return result.filePaths
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose export folder',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:saveAudioFile', async (_e, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Export processed audio',
      defaultPath: defaultName,
      filters: [
        { name: 'WAV', extensions: ['wav'] },
        { name: 'MP3', extensions: ['mp3'] }
      ]
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle('fs:readFile', async (_e, filePath: string) => {
    const buf = await readFile(filePath)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  })

  ipcMain.handle(
    'fs:writeFile',
    async (_e, filePath: string, data: ArrayBuffer) => {
      await writeFile(filePath, Buffer.from(data))
      return true
    }
  )

  ipcMain.handle('audio:decodeToWav', async (_e, filePath: string) => {
    return decodeFileToWavBuffer(filePath)
  })

  ipcMain.handle(
    'audio:decodeBufferToWav',
    async (_e, data: ArrayBuffer, suggestedExt?: string) => {
      return decodeBufferToWavBuffer(data, suggestedExt || 'bin')
    }
  )

  ipcMain.handle('youtube:importFromUrl', async (_e, url: string) => {
    return downloadMediaAudio(url)
  })

  ipcMain.handle('presets:load', async () => {
    const path = presetsPath()
    if (!existsSync(path)) return []
    try {
      const raw = await readFile(path, 'utf-8')
      return JSON.parse(raw)
    } catch {
      return []
    }
  })

  ipcMain.handle('presets:save', async (_e, presets: unknown) => {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) await mkdir(dir, { recursive: true })
    await writeFile(presetsPath(), JSON.stringify(presets, null, 2), 'utf-8')
    return true
  })

  ipcMain.handle('app:getPath', (_e, name: string) => {
    return app.getPath(name as 'userData' | 'downloads' | 'desktop')
  })

  registerUpdaterIpc()
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  initAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
