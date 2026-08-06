import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { springSnappy } from '../../motion'
import './Slider.css'

type Props = {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  label: string
  displayValue: string
  disabled?: boolean
  /**
   * Scale applied when editing (e.g. 100 for 0–1 wet → percent,
   * 1000 for seconds → ms). Defaults to 1.
   */
  editScale?: number
}

const decimalsForStep = (step: number): number => {
  if (step >= 1) return 0
  const s = step.toString()
  if (s.includes('e-')) {
    return Number(s.split('e-')[1]) || 2
  }
  const i = s.indexOf('.')
  return i >= 0 ? s.length - i - 1 : 2
}

export function Slider({
  value,
  min,
  max,
  step = 0.01,
  onChange,
  label,
  displayValue,
  disabled,
  editScale = 1
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [dragging, setDragging] = useState(false)
  const percent = (value - min) / (max - min || 1)

  const snap = useCallback(
    (n: number) => {
      let next = n
      if (step) next = Math.round(next / step) * step
      // avoid float junk like 0.30000000004
      const d = decimalsForStep(step)
      next = Number(next.toFixed(d))
      return Math.min(max, Math.max(min, next))
    },
    [max, min, step]
  )

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current
      if (!el || disabled) return
      const { left, width } = el.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (clientX - left) / width))
      const next = min + ratio * (max - min)
      onChange(snap(next))
    },
    [disabled, max, min, onChange, snap]
  )

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    updateFromClientX(e.clientX)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    updateFromClientX(e.clientX)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setDragging(false)
  }

  const startEdit = () => {
    if (disabled) return
    const scaled = value * editScale
    const d = decimalsForStep(step * editScale)
    setDraft(Number(scaled.toFixed(d)).toString())
    setEditing(true)
  }

  useEffect(() => {
    if (!editing) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [editing])

  const commitEdit = () => {
    setEditing(false)
    const cleaned = draft.trim().replace(/[^\d.+\-eE]/g, '')
    if (!cleaned || cleaned === '+' || cleaned === '-' || cleaned === '.') {
      return
    }
    const parsed = Number(cleaned)
    if (!Number.isFinite(parsed)) return
    onChange(snap(parsed / editScale))
  }

  const cancelEdit = () => {
    setEditing(false)
  }

  return (
    <div className={`slider-field ${disabled ? 'is-disabled' : ''}`}>
      <div className="slider-field__meta">
        <span>{label}</span>
        {editing ? (
          <input
            ref={inputRef}
            className="slider-field__input"
            type="text"
            inputMode="decimal"
            value={draft}
            aria-label={`${label} value`}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitEdit()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancelEdit()
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="slider-field__value"
            onClick={startEdit}
            title="Click to type a value"
            disabled={disabled}
          >
            {displayValue}
          </button>
        )}
      </div>
      <div
        className={`slider ${dragging ? 'is-dragging' : ''}`}
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        tabIndex={0}
      >
        <div className="slider__track">
          <div className="slider__fill" style={{ width: `${percent * 100}%` }} />
          <motion.div
            className="slider__handle"
            style={{ left: `${percent * 100}%` }}
            animate={{
              x: '-50%',
              y: '-50%',
              scale: dragging ? 1.18 : 1
            }}
            transition={springSnappy}
          />
        </div>
      </div>
    </div>
  )
}
