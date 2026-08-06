import {
  applyRemixSettings,
  buildEffectGraph,
  updateConvolverImpulse,
  type EffectGraph,
  type RemixSettings
} from '@shared/dsp'
import { PitchShifter } from 'soundtouchjs'

type EngineState = {
  buffer: AudioBuffer | null
  playing: boolean
  startedAt: number
  offset: number
  duration: number
}

/**
 * Live preview engine. Extension-parity path uses AudioBufferSourceNode.playbackRate
 * when pitch is linked. SoundTouch (PitchShifter) handles preservesPitch and
 * independent pitchSemitones.
 */
export class AudioEngine {
  private ctx: AudioContext
  private graph: EffectGraph | null = null
  private source: AudioBufferSourceNode | null = null
  private shifter: PitchShifter | null = null
  private settings: RemixSettings
  private bypass = false
  private state: EngineState = {
    buffer: null,
    playing: false,
    startedAt: 0,
    offset: 0,
    duration: 0
  }
  private lastDecay: number
  private lastPreDelay: number
  private onEndedCallback: (() => void) | null = null
  private analyser: AnalyserNode

  constructor(settings: RemixSettings) {
    this.ctx = new AudioContext()
    this.settings = settings
    this.lastDecay = settings.decaySeconds
    this.lastPreDelay = settings.preDelaySeconds
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
  }

  get context(): AudioContext {
    return this.ctx
  }

  get analyserNode(): AnalyserNode {
    return this.analyser
  }

  get isPlaying(): boolean {
    return this.state.playing
  }

  get currentTime(): number {
    if (!this.state.playing) return this.state.offset
    const rate = this.effectiveTempo()
    const elapsed = (this.ctx.currentTime - this.state.startedAt) * rate
    return Math.min(this.state.offset + elapsed, this.state.duration)
  }

  get duration(): number {
    return this.state.duration
  }

  get buffer(): AudioBuffer | null {
    return this.state.buffer
  }

  onEnded(cb: (() => void) | null): void {
    this.onEndedCallback = cb
  }

  private effectiveTempo(): number {
    if (this.bypass) return 1
    return this.settings.playbackRate
  }

  private needsSoundTouch(): boolean {
    if (this.bypass) return false
    return (
      this.settings.preservesPitch ||
      Math.abs(this.settings.pitchSemitones) > 0.001
    )
  }

  private pitchRatio(): number {
    return Math.pow(2, this.settings.pitchSemitones / 12)
  }

  async initGraph(): Promise<void> {
    if (this.graph) {
      this.graph.dispose()
    }
    this.graph = await buildEffectGraph(this.ctx, this.settings)
    this.graph.output.connect(this.analyser)
    this.analyser.connect(this.ctx.destination)
    applyRemixSettings(this.graph, this.settings, this.bypass)
  }

  async loadBuffer(buffer: AudioBuffer): Promise<void> {
    this.stop()
    this.state.buffer = buffer
    this.state.duration = buffer.duration
    this.state.offset = 0
    if (!this.graph) await this.initGraph()
  }

  async updateSettings(settings: RemixSettings): Promise<void> {
    const wasPlaying = this.state.playing
    const time = this.currentTime
    const irChanged =
      settings.decaySeconds !== this.lastDecay ||
      settings.preDelaySeconds !== this.lastPreDelay
    const prevNeedsST = this.needsSoundTouch()

    this.settings = settings
    const nextNeedsST = this.needsSoundTouch()
    const pathChanged = prevNeedsST !== nextNeedsST
    // Only rebuild playback when switching BufferSource ↔ SoundTouch
    const willRestart = Boolean(wasPlaying && this.state.buffer && pathChanged)

    if (!this.graph) {
      await this.initGraph()
    } else {
      applyRemixSettings(this.graph, settings, this.bypass)
      if (irChanged) {
        await updateConvolverImpulse(
          this.graph,
          this.ctx,
          settings.decaySeconds,
          settings.preDelaySeconds
        )
        this.lastDecay = settings.decaySeconds
        this.lastPreDelay = settings.preDelaySeconds
      }
    }

    if (willRestart) {
      this.stopInternal(false)
      this.state.offset = time
      await this.play(this.state.offset)
      return
    }

    if (this.shifter && nextNeedsST) {
      this.applyShifterParams(this.shifter)
    } else if (this.source && !nextNeedsST) {
      this.source.playbackRate.value = this.bypass ? 1 : settings.playbackRate
    }
  }

  setBypass(bypass: boolean): void {
    this.bypass = bypass
    if (this.graph) {
      applyRemixSettings(this.graph, this.settings, bypass)
    }
  }

  private applyShifterParams(shifter: PitchShifter): void {
    if (this.bypass) {
      shifter.tempo = 1
      shifter.pitch = 1
      return
    }
    shifter.tempo = this.settings.playbackRate
    // When preservesPitch: tempo changes, pitch stays (plus semitone offset)
    // When not: classic linked pitch is handled by BufferSource path instead
    shifter.pitch = this.pitchRatio()
  }

  async play(fromOffset?: number): Promise<void> {
    if (!this.state.buffer || !this.graph) return
    if (this.ctx.state === 'suspended') await this.ctx.resume()

    this.stopInternal(false)
    let offset = fromOffset ?? this.state.offset
    // Play at end → restart from beginning (common media-player UX)
    if (this.state.duration > 0 && offset >= this.state.duration - 0.05) {
      offset = 0
    }
    this.state.offset = offset

    if (this.needsSoundTouch()) {
      const shifter = new PitchShifter(this.ctx, this.state.buffer, 4096, () => {
        if (this.shifter === shifter) {
          this.state.playing = false
          this.state.offset = this.state.duration
          this.shifter = null
          this.onEndedCallback?.()
        }
      })
      this.applyShifterParams(shifter)
      shifter.connect(this.graph.input)
      // Setter expects 0–1 fraction (getter returns 0–100 — do not mix them)
      if (offset > 0 && this.state.duration > 0) {
        shifter.percentagePlayed = offset / this.state.duration
      }
      shifter.on('play', (detail: { timePlayed: number; percentagePlayed: number }) => {
        // percentagePlayed is 0–100 from soundtouchjs getter
        if (detail.percentagePlayed >= 99.9) {
          try {
            shifter.disconnect()
          } catch {
            // ignore
          }
          if (this.shifter === shifter) {
            this.shifter = null
            this.state.playing = false
            this.state.offset = this.state.duration
            this.onEndedCallback?.()
          }
        }
      })
      this.shifter = shifter
    } else {
      const source = this.ctx.createBufferSource()
      source.buffer = this.state.buffer
      source.playbackRate.value = this.bypass ? 1 : this.settings.playbackRate
      source.connect(this.graph.input)
      source.onended = () => {
        if (this.source === source) {
          this.state.playing = false
          this.state.offset = this.state.duration
          this.source = null
          this.onEndedCallback?.()
        }
      }
      source.start(0, offset)
      this.source = source
    }

    this.state.startedAt = this.ctx.currentTime
    this.state.playing = true
  }

  pause(): void {
    if (!this.state.playing) return
    const t = this.currentTime
    this.stopInternal(false)
    this.state.offset = t
    this.state.playing = false
  }

  stop(): void {
    this.stopInternal(false)
    this.state.offset = 0
    this.state.playing = false
  }

  async seek(time: number): Promise<void> {
    const clamped = Math.max(0, Math.min(time, this.state.duration))
    const wasPlaying = this.state.playing
    this.stopInternal(false)
    this.state.offset = clamped
    if (wasPlaying) await this.play(clamped)
  }

  private stopInternal(_resetOffset: boolean): void {
    if (this.source) {
      try {
        this.source.onended = null
        this.source.stop()
        this.source.disconnect()
      } catch {
        // already stopped
      }
      this.source = null
    }
    if (this.shifter) {
      try {
        this.shifter.disconnect()
      } catch {
        // ignore
      }
      this.shifter = null
    }
    this.state.playing = false
  }

  async dispose(): Promise<void> {
    this.stop()
    this.graph?.dispose()
    this.graph = null
    await this.ctx.close()
  }
}
