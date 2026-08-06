declare module 'soundtouchjs' {
  export class PitchShifter {
    constructor(
      context: AudioContext,
      buffer: AudioBuffer,
      bufferSize?: number,
      onEnd?: () => void
    )
    tempo: number
    pitch: number
    pitchSemitones: number
    rate: number
    percentagePlayed: number
    duration: number
    connect(node: AudioNode): void
    disconnect(): void
    on(event: 'play', cb: (detail: { timePlayed: number; percentagePlayed: number }) => void): void
    off(event?: string): void
  }

  export class SoundTouch {
    tempo: number
    pitch: number
    rate: number
  }
}

declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number)
    encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array
    flush(): Int8Array
  }
}
