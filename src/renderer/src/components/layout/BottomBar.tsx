import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/appStore'
import { formatTime } from '../library/LibraryPanel'
import { pressable, springSoft, springSnappy, transitionBase } from '../../motion'
import './BottomBar.css'

type Props = {
  duration: number
  onPlayPause: () => void
  onSeek: (t: number) => void
  onExport: (format: 'wav' | 'mp3') => void
  onBatch: () => void
}

export function BottomBar({
  duration,
  onPlayPause,
  onSeek,
  onExport,
  onBatch
}: Props) {
  const {
    tracks,
    activeTrackId,
    isPlaying,
    currentTime,
    volume,
    setVolume,
    abBypass,
    setAbBypass,
    exportProgress
  } = useAppStore()

  const track = tracks.find((t) => t.id === activeTrackId)
  const muted = volume <= 0.001

  return (
    <motion.footer
      className="bottom-bar"
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...springSoft, delay: 0.1 }}
    >
      <div className="bottom-bar__track">
        <div className="bottom-bar__art" aria-hidden />
        <div className="bottom-bar__meta">
          <div className="bottom-bar__title" title={track?.name ?? undefined}>
            {track?.name ?? 'No track loaded'}
          </div>
          <div className="bottom-bar__sub">
            {track ? 'Local file' : 'Import audio to begin'}
          </div>
        </div>
      </div>

      <div className="bottom-bar__transport">
        <div className="transport-controls">
          <motion.button
            type="button"
            className={`ab-btn ${abBypass ? 'is-on' : ''}`}
            onClick={() => setAbBypass(!abBypass)}
            title="Compare original vs processed"
            {...pressable}
            transition={springSnappy}
          >
            A/B
          </motion.button>
          <motion.button
            type="button"
            className="play-btn"
            onClick={onPlayPause}
            disabled={!track || track.loading}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={springSnappy}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M8 5.5v13l11-6.5L8 5.5z" />
              </svg>
            )}
          </motion.button>
        </div>
        <div className="seek-row">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={Math.min(currentTime, duration || 0)}
            disabled={!duration}
            onChange={(e) => onSeek(Number(e.target.value))}
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="bottom-bar__actions">
        <AnimatePresence mode="popLayout" initial={false}>
          {exportProgress?.active ? (
            <motion.div
              key="export-progress"
              className="export-progress"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={transitionBase}
            >
              <span>{exportProgress.label}</span>
              <div className="export-progress__bar">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${exportProgress.progress * 100}%` }}
                  transition={transitionBase}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="volume"
              className={`volume-control ${muted ? 'is-muted' : ''}`}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={transitionBase}
            >
              <span className="volume-control__icon" aria-hidden>
                {muted ? (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M4.3 3.7 3 5l4.2 4.2H3v5.6h3.8L12 20.8V9.8l5.7 5.7c-.6.5-1.3.9-2.1 1.1v2.1a7.9 7.9 0 0 0 3.5-1.7L19 19l1.3-1.3L4.3 3.7zM16.5 12c0-.6-.1-1.2-.3-1.7l1.5-1.5A5.9 5.9 0 0 1 18.7 12c0 1.1-.3 2.1-.8 3l-1.5-1.5c.1-.5.1-1 .1-1.5zM12 4l-1.8 1.8L12 7.6V4z" />
                  </svg>
                ) : volume < 0.4 ? (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M3 9.2v5.6h3.8L12 20.8V3.2L6.8 9.2H3zm10.5 2.8c0-.6-.1-1.2-.3-1.7l1.5-1.5A5.9 5.9 0 0 1 15.7 12c0 1.1-.3 2.1-.8 3l-1.5-1.5c.1-.5.1-1 .1-1.5z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M3 9.2v5.6h3.8L12 20.8V3.2L6.8 9.2H3zm13.5 2.8A5.9 5.9 0 0 0 14.7 8l1.5-1.5A7.9 7.9 0 0 1 18.7 12a7.9 7.9 0 0 1-2.5 5.5L14.7 16a5.9 5.9 0 0 0 1.8-4z" />
                  </svg>
                )}
              </span>
              <input
                type="range"
                className="volume-control__slider"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                aria-label="Volume"
                title={`${Math.round(volume * 100)}%`}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          className="action-btn"
          onClick={onBatch}
          disabled={!tracks.length}
          {...pressable}
          transition={springSnappy}
        >
          Batch
        </motion.button>
        <motion.button
          type="button"
          className="action-btn"
          onClick={() => onExport('wav')}
          disabled={!track || track.loading}
          {...pressable}
          transition={springSnappy}
        >
          WAV
        </motion.button>
        <motion.button
          type="button"
          className="action-btn action-btn--primary"
          onClick={() => onExport('mp3')}
          disabled={!track || track.loading}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={springSnappy}
        >
          Export MP3
        </motion.button>
      </div>
    </motion.footer>
  )
}
