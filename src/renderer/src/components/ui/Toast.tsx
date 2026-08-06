import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toastMotion, springSnappy } from '../../motion'
import './Toast.css'

export type ToastItem = {
  id: string
  message: string
  actionLabel?: string
  onAction?: () => void
  tone?: 'default' | 'accent' | 'danger'
  sticky?: boolean
}

type ToastContextValue = {
  pushToast: (toast: Omit<ToastItem, 'id'> & { id?: string }) => string
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback(
    (toast: Omit<ToastItem, 'id'> & { id?: string }) => {
      const id = toast.id ?? crypto.randomUUID()
      setToasts((prev) => {
        const withoutDup = prev.filter((t) => t.id !== id)
        return [...withoutDup, { ...toast, id }]
      })
      if (!toast.sticky) {
        window.setTimeout(() => dismissToast(id), 6_000)
      }
      return id
    },
    [dismissToast]
  )

  const value = useMemo(
    () => ({ pushToast, dismissToast }),
    [pushToast, dismissToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-host" aria-live="polite">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast toast--${t.tone ?? 'default'}`}
              variants={toastMotion}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
              transition={springSnappy}
            >
              <p className="toast__message">{t.message}</p>
              <div className="toast__actions">
                {t.onAction && t.actionLabel ? (
                  <button
                    type="button"
                    className="toast__btn toast__btn--primary"
                    onClick={() => {
                      t.onAction?.()
                      dismissToast(t.id)
                    }}
                  >
                    {t.actionLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="toast__btn"
                  onClick={() => dismissToast(t.id)}
                  aria-label="Dismiss"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
