/** Extensions Chromium decodeAudioData usually handles without ffmpeg. */
export const CHROME_FAST_EXT = new Set([
  'mp3',
  'wav',
  'wave',
  'flac',
  'ogg',
  'oga',
  'opus',
  'webm',
  'm4a',
  'aac',
  'mp4',
  'weba'
])

/**
 * Comprehensive list of audio / audio-containing extensions for dialogs & hints.
 * Actual decode uses Chromium first, then ffmpeg for anything else.
 */
export const AUDIO_EXTENSIONS: string[] = [
  // Common lossy / lossless
  'mp3',
  'mp2',
  'mp1',
  'wav',
  'wave',
  'flac',
  'ogg',
  'oga',
  'opus',
  'spx',
  'm4a',
  'm4b',
  'aac',
  'ac3',
  'eac3',
  'dts',
  'dtshd',
  'wma',
  'asf',
  'ape',
  'wv',
  'wvc',
  'tak',
  'tta',
  'mpc',
  'mp+',
  'mpp',
  'ofr',
  'ofs',
  'off',
  // PCM / studio
  'aiff',
  'aif',
  'aifc',
  'caf',
  'snd',
  'au',
  'voc',
  'w64',
  'rf64',
  'bwf',
  'amb',
  'ircam',
  'sf',
  'paf',
  'fap',
  'sd2',
  'raw',
  'pcm',
  's16le',
  's24le',
  's32le',
  'f32le',
  'f64le',
  // Voice / telephony
  'amr',
  'awb',
  'gsm',
  '3gp',
  '3g2',
  '3ga',
  'ra',
  'ram',
  'rm',
  'rmvb',
  'qcp',
  'vox',
  // Containers with audio
  'mka',
  'mkv',
  'webm',
  'mp4',
  'm4v',
  'mov',
  'qt',
  'avi',
  'flv',
  'f4v',
  'f4a',
  'ts',
  'mts',
  'm2ts',
  'vob',
  'ogv',
  'divx',
  'xvid',
  'wmv',
  'nut',
  // Hi-res / DSD
  'dsf',
  'dff',
  'dsd',
  'sacd',
  // Tracker / chiptune / game (ffmpeg where supported)
  'mod',
  's3m',
  'xm',
  'it',
  'mtm',
  'umx',
  'nsf',
  'nsfe',
  'spc',
  'vgm',
  'vgz',
  'gbs',
  'ay',
  'sap',
  'sid',
  'psf',
  'minipsf',
  'usf',
  'gsf',
  '2sf',
  'ssf',
  'dsf',
  // MIDI (ffmpeg may need a soundfont; still offered for import attempts)
  'mid',
  'midi',
  'kar',
  'rmi',
  // Misc
  '8svx',
  'iff',
  'svx',
  'nist',
  'sph',
  'shn',
  'apl',
  'mac',
  'la',
  'pac',
  'rka',
  'shorten',
  'act',
  'alac',
  'apl',
  'cda',
  'adx',
  'aix',
  'oma',
  'aa3',
  'at3',
  'omg',
  'aa',
  'aax',
  'mogg',
  'opus',
  'weba'
]

/** Deduped, lowercased extensions for dialogs. */
export const AUDIO_EXTENSIONS_UNIQUE: string[] = Array.from(
  new Set(AUDIO_EXTENSIONS.map((e) => e.toLowerCase()))
).sort()

export const getExtension = (filePath: string): string => {
  const base = filePath.replace(/\\/g, '/').split('/').pop() || ''
  // strip blob hash suffix: blob:...#name.ext
  const name = base.includes('#') ? base.split('#').pop() || base : base
  const dot = name.lastIndexOf('.')
  if (dot < 0) return ''
  return name.slice(dot + 1).toLowerCase()
}

export const isChromeFastPath = (filePath: string): boolean => {
  const ext = getExtension(filePath)
  return ext !== '' && CHROME_FAST_EXT.has(ext)
}

export const isLikelyAudioPath = (filePath: string): boolean => {
  const ext = getExtension(filePath)
  if (!ext) return true // extensionless — let ffmpeg decide
  return AUDIO_EXTENSIONS_UNIQUE.includes(ext)
}
