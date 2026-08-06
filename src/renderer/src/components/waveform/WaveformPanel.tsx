import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/appStore'
import { springSoft } from '../../motion'
import './WaveformPanel.css'

type Props = {
  analyser: AnalyserNode | null
  onSeek: (time: number) => void
  duration: number
}

export function WaveformPanel({ analyser, onSeek, duration }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const peaks = useAppStore((s) => {
    const t = s.tracks.find((x) => x.id === s.activeTrackId)
    return t?.peaks ?? null
  })
  const currentTime = useAppStore((s) => s.currentTime)
  const isPlaying = useAppStore((s) => s.isPlaying)
  const settingsKey = useAppStore(
    (s) =>
      `${s.settings.playbackRate}-${s.settings.reverbWetMix}-${s.settings.lowBandDecibels}-${s.settings.pitchSemitones}`
  )
  const loading = useAppStore((s) => {
    const t = s.tracks.find((x) => x.id === s.activeTrackId)
    return t?.loading ?? false
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const freq = new Uint8Array(analyser?.frequencyBinCount ?? 0)

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const { width: cssW, height: cssH } = canvas.getBoundingClientRect()
      const w = Math.floor(cssW * dpr)
      const h = Math.floor(cssH * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      ctx.clearRect(0, 0, w, h)

      // Subtle playback energy — capped so peaks stay readable
      let energy = 0
      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freq)
        let sum = 0
        for (let i = 0; i < freq.length; i++) sum += freq[i]
        energy = Math.min(0.18, (sum / (freq.length * 255)) * 0.35)
      }

      if (peaks && peaks.length) {
        const mid = h / 2
        const barW = w / peaks.length
        const playheadX =
          duration > 0 ? (currentTime / duration) * w : 0

        // played region tint
        if (duration > 0 && playheadX > 0) {
          ctx.fillStyle = 'rgba(61, 222, 168, 0.12)'
          ctx.fillRect(0, 0, playheadX, h)
        }

        const gap = Math.max(0.5 * dpr, barW > 2 * dpr ? dpr : 0)
        for (let i = 0; i < peaks.length; i++) {
          const amp = Math.min(1, peaks[i] * (0.92 + energy))
          const barH = Math.max(2 * dpr, amp * mid * 0.88)
          const x = i * barW
          const bw = Math.max(1, barW - gap)
          const played = duration > 0 && x + bw / 2 <= playheadX
          ctx.fillStyle = played
            ? 'rgba(61, 222, 168, 0.95)'
            : 'rgba(232, 230, 240, 0.72)'
          ctx.fillRect(x, mid - barH, bw, barH * 2)
        }

        // playhead
        if (duration > 0) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(playheadX - dpr, 0, Math.max(2, 2 * dpr), h)
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fillRect(0, h / 2 - dpr, w, Math.max(1, 2 * dpr))
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [analyser, peaks, currentTime, duration, isPlaying, settingsKey])

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    onSeek(ratio * duration)
  }

  return (
    <motion.section
      className="glass-panel waveform-panel"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
    >
      <div className="panel-header">Waveform</div>
      <div className="waveform-stage">
        {loading && <div className="skeleton waveform-skeleton" />}
        <canvas ref={canvasRef} className="waveform-canvas" onClick={onClick} />
      </div>
    </motion.section>
  )
}
