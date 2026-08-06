import { useCallback, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type LibraryTrack } from '../../store/appStore'
import { basename } from '../../audio/decode'
import { isLikelyAudioPath } from '@shared/audioFormats'
import { pressable, springSoft, springSnappy, transitionBase } from '../../motion'
import './LibraryPanel.css'

type Props = {
  onImportPaths: (paths: string[]) => Promise<void>
}

export function LibraryPanel({ onImportPaths }: Props) {
  const { tracks, activeTrackId, setActiveTrack, removeTrack } = useAppStore()
  const [dragging, setDragging] = useState(false)
  const [ytUrl, setYtUrl] = useState('')
  const [ytLoading, setYtLoading] = useState(false)
  const [ytError, setYtError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasElectron = typeof window !== 'undefined' && !!window.electronAPI

  const onBrowse = async () => {
    if (window.electronAPI) {
      const paths = await window.electronAPI.openAudioFiles()
      if (paths.length) await onImportPaths(paths)
      return
    }
    inputRef.current?.click()
  }

  const onUrlImport = async () => {
    if (!window.electronAPI || !ytUrl.trim() || ytLoading) return
    setYtError(null)
    setYtLoading(true)
    try {
      const { filePath } = await window.electronAPI.importFromUrl(ytUrl.trim())
      await onImportPaths([filePath])
      setYtUrl('')
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message.split('\n')[0]
          : typeof err === 'object' &&
              err &&
              'message' in err &&
              typeof (err as { message: unknown }).message === 'string'
            ? (err as { message: string }).message.split('\n')[0]
            : 'Download failed'
      setYtError(msg)
    } finally {
      setYtLoading(false)
    }
  }

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      // Prefer likely-audio names; if none match, try everything and let ffmpeg decide
      const preferred = files.filter((f) => isLikelyAudioPath(f.name))
      const chosen = preferred.length ? preferred : files
      if (!chosen.length) return

      if (window.electronAPI) {
        const paths = chosen
          .map((f) => (f as File & { path?: string }).path)
          .filter(Boolean) as string[]
        if (paths.length) {
          await onImportPaths(paths)
          return
        }
      }
      const pseudo = chosen.map((f) => URL.createObjectURL(f) + '#' + f.name)
      await onImportPaths(pseudo)
    },
    [onImportPaths]
  )

  const empty = tracks.length === 0

  return (
    <motion.aside
      className="glass-panel library-panel"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={springSoft}
    >
      <div className="panel-header">
        Library
        <motion.button
          type="button"
          className="text-btn"
          onClick={onBrowse}
          {...pressable}
          transition={springSnappy}
        >
          Import
        </motion.button>
      </div>

      {hasElectron && (
        <form
          className="yt-import"
          onSubmit={(e) => {
            e.preventDefault()
            void onUrlImport()
          }}
        >
          <input
            type="url"
            className="yt-import__input"
            placeholder="Paste YouTube or TikTok URL…"
            value={ytUrl}
            disabled={ytLoading}
            onChange={(e) => {
              setYtUrl(e.target.value)
              if (ytError) setYtError(null)
            }}
            aria-label="Media URL"
          />
          <button
            type="submit"
            className="yt-import__btn"
            disabled={ytLoading || !ytUrl.trim()}
          >
            {ytLoading ? '…' : 'Link'}
          </button>
          {ytError && <p className="yt-import__error">{ytError}</p>}
        </form>
      )}

      <div
        className={`dropzone ${dragging ? 'is-dragging' : ''} ${empty ? 'is-empty' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={empty ? onBrowse : undefined}
      >
        {empty ? (
          <div className="dropzone__hint">
            <strong>Drop audio here</strong>
            <span>Any format ffmpeg can read</span>
            {hasElectron && <span>or paste a YouTube / TikTok link above</span>}
          </div>
        ) : (
          <ul className="track-list">
            <AnimatePresence initial={false}>
              {tracks.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  active={track.id === activeTrackId}
                  onSelect={() => setActiveTrack(track.id)}
                  onRemove={() => removeTrack(track.id)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*,*"
        multiple
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files || [])
          const pseudo = files.map((f) => URL.createObjectURL(f) + '#' + f.name)
          if (pseudo.length) await onImportPaths(pseudo)
          e.target.value = ''
        }}
      />
    </motion.aside>
  )
}

function TrackRow({
  track,
  active,
  onSelect,
  onRemove
}: {
  track: LibraryTrack
  active: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const durationLabel = useMemo(() => formatTime(track.duration), [track.duration])

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={transitionBase}
      className={`track-row ${active ? 'is-active' : ''}`}
      onClick={onSelect}
    >
      <div className="track-row__main">
        <div className="track-row__name" title={track.name}>
          {track.loading ? <span className="skeleton" style={{ width: '70%', height: 12 }} /> : track.name}
        </div>
        <div className="track-row__meta">{track.loading ? 'Loading…' : durationLabel}</div>
      </div>
      <button
        type="button"
        className="track-row__remove"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        aria-label="Remove"
      >
        ×
      </button>
    </motion.li>
  )
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export { basename }
