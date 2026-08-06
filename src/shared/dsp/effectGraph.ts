import {
  BASS_SHELF_FREQUENCY_HZ,
  DEFAULT_DECAY_SECONDS,
  DEFAULT_PRE_DELAY_SECONDS
} from './constants'
import { createImpulseResponse } from './impulseResponse'
import type { EffectGraph, EqBand, RemixSettings } from './types'

const applyEqBand = (filter: BiquadFilterNode, band: EqBand): void => {
  filter.type = band.type
  filter.frequency.value = band.frequency
  filter.gain.value = band.gain
  filter.Q.value = band.Q
}

/**
 * Builds the extension-faithful wet/dry graph, plus optional multi-band EQ
 * inserted after the bass lowshelf:
 *
 * input → bass(lowshelf@160) → [eq…] → dryGain → output
 *                            ↘ wetInput → convolver → wetGain → output
 */
export const buildEffectGraph = async (
  ctx: BaseAudioContext,
  settings: Pick<RemixSettings, 'decaySeconds' | 'preDelaySeconds' | 'eqBands'>
): Promise<EffectGraph> => {
  const bassFilter = ctx.createBiquadFilter()
  bassFilter.type = 'lowshelf'
  bassFilter.frequency.value = BASS_SHELF_FREQUENCY_HZ
  bassFilter.gain.value = 0

  const eqFilters = settings.eqBands.map((band) => {
    const filter = ctx.createBiquadFilter()
    applyEqBand(filter, band)
    return filter
  })

  const dryGain = ctx.createGain()
  const wetInput = ctx.createGain()
  wetInput.gain.value = 1
  const wetGain = ctx.createGain()

  const convolver = ctx.createConvolver()
  convolver.buffer = await createImpulseResponse(
    ctx,
    settings.decaySeconds ?? DEFAULT_DECAY_SECONDS,
    settings.preDelaySeconds ?? DEFAULT_PRE_DELAY_SECONDS
  )

  // Chain: bass → eq… → split dry/wet
  let chainHead: AudioNode = bassFilter
  let last: AudioNode = bassFilter
  for (const filter of eqFilters) {
    last.connect(filter)
    last = filter
  }
  last.connect(dryGain)
  last.connect(wetInput)
  wetInput.connect(convolver)
  convolver.connect(wetGain)

  const merger = ctx.createGain()
  merger.gain.value = 1
  dryGain.connect(merger)
  wetGain.connect(merger)

  const dispose = (): void => {
    try {
      bassFilter.disconnect()
      eqFilters.forEach((f) => f.disconnect())
      dryGain.disconnect()
      wetInput.disconnect()
      wetGain.disconnect()
      convolver.disconnect()
      merger.disconnect()
    } catch {
      // already disconnected
    }
  }

  return {
    input: chainHead,
    bassFilter,
    eqFilters,
    dryGain,
    wetInput,
    wetGain,
    convolver,
    output: merger,
    dispose
  }
}

export const applyRemixSettings = (
  graph: EffectGraph,
  settings: RemixSettings,
  bypass = false
): void => {
  if (bypass) {
    graph.bassFilter.gain.value = 0
    graph.eqFilters.forEach((f) => {
      f.gain.value = 0
    })
    graph.wetGain.gain.value = 0
    graph.dryGain.gain.value = 1
    return
  }

  graph.bassFilter.gain.value = settings.lowBandDecibels
  graph.wetGain.gain.value = settings.reverbWetMix
  graph.dryGain.gain.value = 1 - settings.reverbWetMix

  settings.eqBands.forEach((band, i) => {
    const filter = graph.eqFilters[i]
    if (filter) applyEqBand(filter, band)
  })
}

export const updateConvolverImpulse = async (
  graph: EffectGraph,
  ctx: BaseAudioContext,
  decaySeconds: number,
  preDelaySeconds: number
): Promise<void> => {
  graph.convolver.buffer = await createImpulseResponse(
    ctx,
    decaySeconds,
    preDelaySeconds
  )
}
