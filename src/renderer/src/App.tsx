import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AudioEngine } from './audio/AudioEngine'
import { decodeAudioFlexible, extractPeaks } from './audio/decode'
import { renderOffline } from './audio/OfflineRenderer'
import { useAppStore } from './store/appStore'
import { LibraryPanel, basename } from './components/library/LibraryPanel'
import { EffectsPanel } from './components/effects/EffectsPanel'
import { WaveformPanel } from './components/waveform/WaveformPanel'
import { BottomBar } from './components/layout/BottomBar'
import { SplashScreen } from './components/ui/SplashScreen'
import { SettingsPanel } from './components/ui/SettingsPanel'
import { ToastProvider, useToast } from './components/ui/Toast'
import type { UpdateState } from '@shared/update'
import { pressable, springSnappy, transitionBase } from './motion'
import logo from './assets/logo.png'

const IDLE_UPDATE: UpdateState = {
  status: 'idle',
  version: null,
  progress: null,
  error: null
}

function AppShell() {
  const engineRef = useRef<AudioEngine | null>(null)
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map())
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [duration, setDuration] = useState(0)
  const [splash, setSplash] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [appVersion, setAppVersion] = useState('1.0.0')
  const [updateState, setUpdateState] = useState<UpdateState>(IDLE_UPDATE)
  const updateToastId = useRef<string | null>(null)
  const { pushToast } = useToast()

  const settings = useAppStore((s) => s.settings)
  const abBypass = useAppStore((s) => s.abBypass)
  const activeTrackId = useAppStore((s) => s.activeTrackId)
  const isPlaying = useAppStore((s) => s.isPlaying)
  const tracks = useAppStore((s) => s.tracks)
  const addTracks = useAppStore((s) => s.addTracks)
  const updateTrack = useAppStore((s) => s.updateTrack)
  const setPlaying = useAppStore((s) => s.setPlaying)
  const setCurrentTime = useAppStore((s) => s.setCurrentTime)
  const setExportProgress = useAppStore((s) => s.setExportProgress)
  const setCustomPresets = useAppStore((s) => s.setCustomPresets)

  const activeReadyKey = useAppStore((s) => {
    const t = s.tracks.find((x) => x.id === s.activeTrackId)
    if (!t || t.loading || t.duration <= 0) return null
    return `${t.id}:${t.duration}`
  })

  const updateReady =
    updateState.status === 'downloaded' ||
    updateState.status === 'available' ||
    updateState.status === 'downloading'

  const restartToUpdate = useCallback(() => {
    void window.electronAPI?.quitAndInstall()
  }, [])

  const showUpdateToast = useCallback(
    (state: UpdateState) => {
      if (state.status === 'downloaded') {
        updateToastId.current = pushToast({
          id: 'update-ready',
          message: `Update ready${state.version ? ` (v${state.version})` : ''} — restart to apply`,
          actionLabel: 'Restart now',
          onAction: restartToUpdate,
          tone: 'accent',
          sticky: true
        })
      } else if (state.status === 'downloading') {
        const pct = Math.round((state.progress ?? 0) * 100)
        updateToastId.current = pushToast({
          id: 'update-ready',
          message: `Downloading update… ${pct}%`,
          tone: 'accent',
          sticky: true
        })
      } else if (state.status === 'available') {
        updateToastId.current = pushToast({
          id: 'update-ready',
          message: `Update ${state.version ?? ''} found — downloading in the background`,
          tone: 'accent',
          sticky: true
        })
      }
    },
    [pushToast, restartToUpdate]
  )

  useEffect(() => {
    const engine = new AudioEngine(settings)
    engineRef.current = engine
    const started = performance.now()
    void engine.initGraph().then(() => {
      setAnalyser(engine.analyserNode)
      const elapsed = performance.now() - started
      const wait = Math.max(0, 650 - elapsed)
      window.setTimeout(() => setSplash(false), wait)
    })
    engine.onEnded(() => setPlaying(false))

    void window.electronAPI?.loadPresets().then((presets) => {
      if (Array.isArray(presets)) setCustomPresets(presets)
    })

    void window.electronAPI?.getAppVersion().then((v) => {
      if (v) setAppVersion(v)
    })
    void window.electronAPI?.getUpdateState().then((s) => {
      if (s) setUpdateState(s)
    })

    const unsub = window.electronAPI?.onUpdateState((s) => {
      setUpdateState(s)
      if (
        s.status === 'downloaded' ||
        s.status === 'available' ||
        s.status === 'downloading'
      ) {
        showUpdateToast(s)
      }
    })

    // Fallback if engine init hangs
    const failsafe = window.setTimeout(() => setSplash(false), 4_000)

    return () => {
      window.clearTimeout(failsafe)
      unsub?.()
      void engine.dispose()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.setBypass(abBypass)
    void engine.updateSettings(settings)
  }, [settings, abBypass])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const engine = engineRef.current
      if (engine?.isPlaying) {
        setCurrentTime(engine.currentTime)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [setCurrentTime])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine || !activeTrackId || !activeReadyKey) {
      if (!activeTrackId) setDuration(0)
      return
    }
    const buffer = buffersRef.current.get(activeTrackId)
    if (!buffer) return
    void (async () => {
      await engine.loadBuffer(buffer)
      setDuration(buffer.duration)
      setCurrentTime(0)
      setPlaying(false)
    })()
  }, [activeTrackId, activeReadyKey, setCurrentTime, setPlaying])

  const importPaths = useCallback(
    async (paths: string[]) => {
      const engine = engineRef.current
      if (!engine) return

      const newTracks = paths.map((path) => {
        const name =
          path.includes('#') && path.startsWith('blob:')
            ? decodeURIComponent(path.split('#').pop() || 'audio')
            : basename(path)
        return {
          id: crypto.randomUUID(),
          path,
          name,
          peaks: null,
          duration: 0,
          loading: true
        }
      })
      addTracks(newTracks)

      for (const track of newTracks) {
        try {
          let arrayBuffer: ArrayBuffer | undefined
          const isBlob = track.path.startsWith('blob:')

          if (isBlob) {
            const url = track.path.split('#')[0]
            const res = await fetch(url)
            arrayBuffer = await res.arrayBuffer()
          }

          const buffer = await decodeAudioFlexible(engine.context, {
            arrayBuffer,
            filePath: isBlob ? undefined : track.path,
            displayName: track.name
          })
          buffersRef.current.set(track.id, buffer)

          if (useAppStore.getState().activeTrackId === track.id) {
            await engine.loadBuffer(buffer)
            setDuration(buffer.duration)
            setCurrentTime(0)
          }

          updateTrack(track.id, {
            loading: false,
            duration: buffer.duration,
            peaks: extractPeaks(buffer, 600)
          })
        } catch (err) {
          console.error(err)
          const reason =
            err instanceof Error && err.message
              ? err.message.split('\n')[0].slice(0, 80)
              : 'failed'
          updateTrack(track.id, {
            loading: false,
            name: `${track.name} (${reason})`
          })
        }
      }
    },
    [addTracks, updateTrack, setCurrentTime]
  )

  const onPlayPause = async () => {
    const engine = engineRef.current
    if (!engine || !activeTrackId) return

    if (!engine.buffer) {
      const buf = buffersRef.current.get(activeTrackId)
      if (buf) {
        await engine.loadBuffer(buf)
        setDuration(buf.duration)
      }
    }

    if (engine.isPlaying) {
      engine.pause()
      setPlaying(false)
      setCurrentTime(engine.currentTime)
      return
    }
    const atEnd = duration > 0 && engine.currentTime >= duration - 0.05
    if (atEnd) setCurrentTime(0)
    await engine.play()
    setPlaying(true)
    if (atEnd) setCurrentTime(engine.currentTime)
  }

  const onSeek = async (t: number) => {
    const engine = engineRef.current
    if (!engine) return
    await engine.seek(t)
    setCurrentTime(t)
  }

  const onExport = async (format: 'wav' | 'mp3') => {
    if (!activeTrackId) return
    const buffer = buffersRef.current.get(activeTrackId)
    const track = tracks.find((t) => t.id === activeTrackId)
    if (!buffer || !track) return

    setExportProgress({ active: true, label: 'Rendering…', progress: 0.05 })
    try {
      const result = await renderOffline(buffer, settings, format, (p) => {
        setExportProgress({
          active: true,
          label: p.phase === 'encoding' ? 'Encoding…' : 'Rendering…',
          progress: p.progress
        })
      })

      const base = track.name.replace(/\.[^.]+$/, '')
      const defaultName = `${base}.slowed.${result.extension}`

      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveAudioFile(defaultName)
        if (savePath) {
          let outPath = savePath
          if (!outPath.toLowerCase().endsWith(`.${result.extension}`)) {
            outPath = savePath.replace(/\.[^.]+$/, '') + `.${result.extension}`
          }
          await window.electronAPI.writeFile(outPath, result.data)
          pushToast({ message: `Exported ${result.extension.toUpperCase()}`, tone: 'accent' })
        }
      } else {
        const blob = new Blob([result.data], {
          type: result.extension === 'mp3' ? 'audio/mpeg' : 'audio/wav'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultName
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error(err)
      pushToast({
        message: 'Export failed. See console for details.',
        tone: 'danger'
      })
    } finally {
      setExportProgress(null)
    }
  }

  const onBatch = async () => {
    if (!tracks.length || !window.electronAPI) {
      pushToast({
        message: 'Batch export requires the desktop app with at least one track.',
        tone: 'danger'
      })
      return
    }
    const dir = await window.electronAPI.openDirectory()
    if (!dir) return

    setExportProgress({ active: true, label: 'Batch…', progress: 0 })
    const ready = tracks.filter((t) => buffersRef.current.has(t.id))
    for (let i = 0; i < ready.length; i++) {
      const track = ready[i]
      const buffer = buffersRef.current.get(track.id)!
      setExportProgress({
        active: true,
        label: `Batch ${i + 1}/${ready.length}`,
        progress: i / ready.length
      })
      try {
        const result = await renderOffline(buffer, settings, 'wav', (p) => {
          setExportProgress({
            active: true,
            label: `Batch ${i + 1}/${ready.length}`,
            progress: (i + p.progress) / ready.length
          })
        })
        const base = track.name.replace(/\.[^.]+$/, '')
        const outPath = `${dir}\\${base}.slowed.wav`
        await window.electronAPI.writeFile(outPath, result.data)
      } catch (err) {
        console.error(err)
      }
    }
    setExportProgress(null)
    pushToast({
      message: `Batch export finished (${ready.length} file${ready.length === 1 ? '' : 's'})`,
      tone: 'accent'
    })
  }

  return (
    <>
      <AnimatePresence>
        {splash ? <SplashScreen visible key="splash" /> : null}
      </AnimatePresence>

      <div className={`app-shell ${splash ? 'app-shell--booting' : ''}`}>
        <header className="titlebar">
          <div className="titlebar__brand">
            <img src={logo} alt="" className="titlebar__logo" />
            Slowed <span>+ Reverb</span>
          </div>
          <div className="titlebar__spacer" />
          <motion.button
            type="button"
            className="titlebar__settings"
            title="About & updates"
            aria-label="About and updates"
            {...pressable}
            transition={springSnappy}
            onClick={() => {
              setSettingsOpen(true)
              if (updateReady) showUpdateToast(updateState)
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.77 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z" />
            </svg>
            {updateReady ? (
              <motion.span
                className="titlebar__update-dot"
                animate={{ opacity: [0.45, 1, 0.45], scale: [1, 1.2, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : null}
          </motion.button>
        </header>

        <motion.div
          className="app-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: splash ? 0 : 1 }}
          transition={transitionBase}
        >
          <LibraryPanel onImportPaths={importPaths} />
          <div className="center-column">
            <WaveformPanel
              analyser={analyser}
              duration={duration}
              onSeek={onSeek}
            />
          </div>
          <EffectsPanel />
        </motion.div>

        <BottomBar
          duration={duration}
          onPlayPause={() => void onPlayPause()}
          onSeek={(t) => void onSeek(t)}
          onExport={(f) => void onExport(f)}
          onBatch={() => void onBatch()}
        />
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        version={appVersion}
        updateState={updateState}
        onCheckUpdates={() => {
          void window.electronAPI?.checkForUpdates().then((res) => {
            if (!res?.ok && res?.reason === 'dev') {
              pushToast({ message: 'Updates are only checked in packaged builds.' })
            } else if (!res?.ok && res?.reason) {
              pushToast({ message: `Update check failed: ${res.reason}`, tone: 'danger' })
            }
          })
        }}
        onRestart={restartToUpdate}
      />
    </>
  )
}

export function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  )
}
