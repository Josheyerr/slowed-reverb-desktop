import { motion } from 'framer-motion'
import {
  MAX_DECAY_SECONDS,
  MAX_LOW_BAND_DECIBELS,
  MAX_PITCH_SEMITONES,
  MAX_PLAYBACK_RATE,
  MAX_PRE_DELAY_SECONDS,
  MAX_REVERB_WET_MIX,
  MIN_DECAY_SECONDS,
  MIN_LOW_BAND_DECIBELS,
  MIN_PITCH_SEMITONES,
  MIN_PLAYBACK_RATE,
  MIN_PRE_DELAY_SECONDS,
  MIN_REVERB_WET_MIX
} from '@shared/dsp'
import { useAppStore } from '../../store/appStore'
import { springSoft } from '../../motion'
import { Slider } from '../controls/Slider'
import { Toggle } from '../controls/Toggle'
import { PresetsBar } from './PresetsBar'
import './EffectsPanel.css'

export function EffectsPanel() {
  const { settings, setSettings } = useAppStore()

  return (
    <motion.aside
      className="glass-panel effects-column"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={springSoft}
    >
      <div className="panel-header">Effects</div>
      <PresetsBar />
      <div className="effects-scroll">
        <section className="effect-card">
          <h3>Speed</h3>
          <Slider
            label="Playback rate"
            min={MIN_PLAYBACK_RATE}
            max={MAX_PLAYBACK_RATE}
            step={0.01}
            value={settings.playbackRate}
            displayValue={`${settings.playbackRate.toFixed(2)}×`}
            onChange={(playbackRate) => setSettings({ playbackRate })}
          />
          <Toggle
            on={settings.preservesPitch}
            onChange={(preservesPitch) => setSettings({ preservesPitch })}
            label="Keep original pitch"
          />
        </section>

        <section className="effect-card">
          <h3>Pitch</h3>
          <Slider
            label="Semitones"
            min={MIN_PITCH_SEMITONES}
            max={MAX_PITCH_SEMITONES}
            step={1}
            value={settings.pitchSemitones}
            displayValue={`${settings.pitchSemitones > 0 ? '+' : ''}${settings.pitchSemitones}`}
            onChange={(pitchSemitones) => setSettings({ pitchSemitones })}
          />
        </section>

        <section className="effect-card">
          <h3>Reverb</h3>
          <Slider
            label="Wet mix"
            min={MIN_REVERB_WET_MIX}
            max={MAX_REVERB_WET_MIX}
            step={0.01}
            value={settings.reverbWetMix}
            editScale={100}
            displayValue={`${Math.round(settings.reverbWetMix * 100)}%`}
            onChange={(reverbWetMix) => setSettings({ reverbWetMix })}
          />
          <Slider
            label="Decay"
            min={MIN_DECAY_SECONDS}
            max={MAX_DECAY_SECONDS}
            step={0.1}
            value={settings.decaySeconds}
            displayValue={`${settings.decaySeconds.toFixed(1)}s`}
            onChange={(decaySeconds) => setSettings({ decaySeconds })}
          />
          <Slider
            label="Pre-delay"
            min={MIN_PRE_DELAY_SECONDS}
            max={MAX_PRE_DELAY_SECONDS}
            step={0.005}
            value={settings.preDelaySeconds}
            editScale={1000}
            displayValue={`${Math.round(settings.preDelaySeconds * 1000)}ms`}
            onChange={(preDelaySeconds) => setSettings({ preDelaySeconds })}
          />
        </section>

        <section className="effect-card">
          <h3>Bass boost</h3>
          <Slider
            label="Lowshelf @ 160 Hz"
            min={MIN_LOW_BAND_DECIBELS}
            max={MAX_LOW_BAND_DECIBELS}
            step={0.1}
            value={settings.lowBandDecibels}
            displayValue={`${settings.lowBandDecibels.toFixed(1)} dB`}
            onChange={(lowBandDecibels) => setSettings({ lowBandDecibels })}
          />
        </section>

        <section className="effect-card">
          <h3>EQ</h3>
          {settings.eqBands.map((band, index) => (
            <Slider
              key={band.id}
              label={`${band.id} · ${Math.round(band.frequency)} Hz`}
              min={-12}
              max={12}
              step={0.5}
              value={band.gain}
              displayValue={`${band.gain > 0 ? '+' : ''}${band.gain.toFixed(1)} dB`}
              onChange={(gain) => {
                const eqBands = settings.eqBands.map((b, i) =>
                  i === index ? { ...b, gain } : b
                )
                setSettings({ eqBands })
              }}
            />
          ))}
        </section>
      </div>
    </motion.aside>
  )
}
