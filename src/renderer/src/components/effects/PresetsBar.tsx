import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/appStore'
import { builtinPresetList } from '@shared/presets'
import { createCustomPreset } from '@shared/presets'
import { pressable, springSnappy } from '../../motion'
import './PresetsBar.css'

export function PresetsBar() {
  const {
    activePresetId,
    customPresets,
    settings,
    applyBuiltinPreset,
    applyCustomPreset,
    upsertCustomPreset,
    deleteCustomPreset
  } = useAppStore()

  const [saving, setSaving] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (saving) inputRef.current?.focus()
  }, [saving])

  useEffect(() => {
    if (!pendingDeleteKey) return
    const clear = () => setPendingDeleteKey(null)
    window.addEventListener('click', clear)
    return () => window.removeEventListener('click', clear)
  }, [pendingDeleteKey])

  const openSaveForm = () => {
    setPendingDeleteKey(null)
    setNameDraft('')
    setSaving(true)
  }

  const cancelSave = () => {
    setSaving(false)
    setNameDraft('')
  }

  const commitSave = () => {
    const name = nameDraft.trim()
    if (!name) return
    upsertCustomPreset(createCustomPreset(name, settings))
    setSaving(false)
    setNameDraft('')
  }

  return (
    <div className="presets-bar">
      <div className="presets-bar__list">
        {builtinPresetList.map((p) => (
          <motion.button
            key={p.id}
            type="button"
            className={`chip ${activePresetId === p.id ? 'is-active' : ''}`}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={springSnappy}
            onClick={() => {
              setPendingDeleteKey(null)
              applyBuiltinPreset(p.id)
            }}
          >
            {p.name}
          </motion.button>
        ))}
        {customPresets.map((p) => {
          const pendingDelete = pendingDeleteKey === p.key
          return (
            <motion.button
              key={p.key}
              type="button"
              className={`chip chip--custom ${activePresetId === p.key ? 'is-active' : ''} ${pendingDelete ? 'is-pending-delete' : ''}`}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={springSnappy}
              onClick={(e) => {
                e.stopPropagation()
                if (pendingDelete) {
                  deleteCustomPreset(p.key)
                  setPendingDeleteKey(null)
                  return
                }
                setPendingDeleteKey(null)
                applyCustomPreset(p.key)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setSaving(false)
                setPendingDeleteKey(p.key)
              }}
              title={
                pendingDelete
                  ? 'Click again to delete'
                  : 'Right-click to delete'
              }
            >
              {pendingDelete ? `Delete “${p.name}”?` : p.name}
            </motion.button>
          )
        })}
        {saving ? (
          <div className="presets-bar__save-form" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              className="presets-bar__name-input"
              type="text"
              value={nameDraft}
              placeholder="Preset name"
              maxLength={40}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitSave()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cancelSave()
                }
              }}
            />
            <motion.button
              type="button"
              className="chip chip--confirm"
              disabled={!nameDraft.trim()}
              onClick={commitSave}
              {...pressable}
              transition={springSnappy}
            >
              Save
            </motion.button>
            <motion.button
              type="button"
              className="chip chip--ghost"
              onClick={cancelSave}
              {...pressable}
              transition={springSnappy}
            >
              Cancel
            </motion.button>
          </div>
        ) : (
          <motion.button
            type="button"
            className="chip chip--ghost"
            onClick={openSaveForm}
            {...pressable}
            transition={springSnappy}
          >
            + Save
          </motion.button>
        )}
      </div>
    </div>
  )
}
