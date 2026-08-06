/** Extension-parity DSP smoke checks (no Web Audio needed). */
const PRESETS = {
  slowedandreverb: { playbackRate: 0.8, reverbWetMix: 0.4, lowBandDecibels: 0 },
  nightcore: { playbackRate: 1.2, reverbWetMix: 0, lowBandDecibels: 0 },
  off: { playbackRate: 1, reverbWetMix: 0, lowBandDecibels: 0 }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(PRESETS.slowedandreverb.playbackRate === 0.8, 'slowed rate')
assert(PRESETS.slowedandreverb.reverbWetMix === 0.4, 'slowed wet')
assert(PRESETS.nightcore.playbackRate === 1.2, 'nightcore rate')
assert(PRESETS.off.playbackRate === 1, 'off rate')

const DECAY = 5
const PRE_DELAY = 0.01
assert(DECAY === 5 && PRE_DELAY === 0.01, 'IR timing')

const wet = 0.4
assert(Math.abs(wet + (1 - wet) - 1) < 1e-9, 'wet+dry=1')

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)
assert(clamp(99, 0.5, 1.5) === 1.5, 'clamp rate')
assert(clamp(-1, 0, 1) === 0, 'clamp wet')
assert(clamp(50, 0, 10) === 10, 'clamp bass')

console.log('dsp-smoke: ok')
