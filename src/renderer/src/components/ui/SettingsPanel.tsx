import { AnimatePresence, motion } from 'framer-motion'
import { springSnappy, transitionBase } from '../../motion'
import type { UpdateState } from '@shared/update'
import './SettingsPanel.css'

type Props = {
  open: boolean
  onClose: () => void
  version: string
  updateState: UpdateState
  onCheckUpdates: () => void
  onRestart: () => void
}

export function SettingsPanel({
  open,
  onClose,
  version,
  updateState,
  onCheckUpdates,
  onRestart
}: Props) {
  const statusLabel = (() => {
    switch (updateState.status) {
      case 'checking':
        return 'Checking for updates…'
      case 'available':
        return `Update ${updateState.version} available — downloading…`
      case 'downloading':
        return `Downloading update… ${Math.round((updateState.progress ?? 0) * 100)}%`
      case 'downloaded':
        return `Update ${updateState.version} ready — restart to apply`
      case 'not-available':
        return 'You’re up to date'
      case 'error':
        return updateState.error || 'Update check failed'
      default:
        return 'Auto-update enabled'
    }
  })()

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className="settings-backdrop"
            aria-label="Close settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitionBase}
            onClick={onClose}
          />
          <motion.aside
            className="settings-panel"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={springSnappy}
            role="dialog"
            aria-label="About and updates"
          >
            <header className="settings-panel__header">
              <h2>About</h2>
              <button type="button" className="settings-panel__close" onClick={onClose}>
                Close
              </button>
            </header>
            <p className="settings-panel__brand">
              Slowed <span>+ Reverb</span>
            </p>
            <p className="settings-panel__version">v{version}</p>
            <p className="settings-panel__status">{statusLabel}</p>

            {(updateState.status === 'downloading' ||
              updateState.status === 'available') && (
              <div className="settings-progress" aria-hidden>
                <motion.div
                  className="settings-progress__fill"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.max(4, (updateState.progress ?? 0.05) * 100)}%`
                  }}
                  transition={transitionBase}
                />
              </div>
            )}

            <div className="settings-panel__actions">
              <motion.button
                type="button"
                className="settings-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={onCheckUpdates}
              >
                Check for updates
              </motion.button>
              {updateState.status === 'downloaded' ? (
                <motion.button
                  type="button"
                  className="settings-btn settings-btn--primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onRestart}
                >
                  Restart now
                </motion.button>
              ) : null}
            </div>

            <section className="settings-panel__credits" aria-label="Credits">
              <h3>Powered by</h3>
              <ul>
                <li>
                  <a
                    href="https://ffmpeg.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    FFmpeg
                  </a>
                  <span> — audio decoding</span>
                </li>
                <li>
                  <a
                    href="https://github.com/yt-dlp/yt-dlp"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    yt-dlp
                  </a>
                  <span> — YouTube download</span>
                </li>
                <li>
                  <a
                    href="https://ssstik.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ssstik.io
                  </a>
                  <span> — TikTok download</span>
                </li>
              </ul>
            </section>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
