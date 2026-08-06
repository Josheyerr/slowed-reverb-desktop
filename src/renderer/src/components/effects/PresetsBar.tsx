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

  const saveCurrent = () => {
    const name = window.prompt('Preset name')
    if (!name?.trim()) return
    upsertCustomPreset(createCustomPreset(name.trim(), settings))
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
            onClick={() => applyBuiltinPreset(p.id)}
          >
            {p.name}
          </motion.button>
        ))}
        {customPresets.map((p) => (
          <motion.button
            key={p.key}
            type="button"
            className={`chip chip--custom ${activePresetId === p.key ? 'is-active' : ''}`}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={springSnappy}
            onClick={() => applyCustomPreset(p.key)}
            onContextMenu={(e) => {
              e.preventDefault()
              if (window.confirm(`Delete preset “${p.name}”?`)) {
                deleteCustomPreset(p.key)
              }
            }}
            title="Right-click to delete"
          >
            {p.name}
          </motion.button>
        ))}
        <motion.button
          type="button"
          className="chip chip--ghost"
          onClick={saveCurrent}
          {...pressable}
          transition={springSnappy}
        >
          + Save
        </motion.button>
      </div>
    </div>
  )
}
