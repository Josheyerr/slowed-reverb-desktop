/**
 * Generates icon.ico + installerSidebar.bmp from build/logo-source.png (or icon.png).
 * Run: npm run assets:brand
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { PNG } from 'pngjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const buildDir = join(root, 'build')
const rendererAssets = join(root, 'src', 'renderer', 'src', 'assets')

mkdirSync(buildDir, { recursive: true })
mkdirSync(rendererAssets, { recursive: true })

const sourceCandidates = [
  join(buildDir, 'logo-source.png'),
  join(buildDir, 'icon.png')
]
const sourcePath = sourceCandidates.find((p) => existsSync(p))
if (!sourcePath) {
  console.error('Missing build/logo-source.png — place a 512+ PNG logo first.')
  process.exit(1)
}

const src = PNG.sync.read(readFileSync(sourcePath))

function resizeNearest(srcPng, size) {
  const out = new PNG({ width: size, height: size })
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.min(srcPng.width - 1, Math.floor((x / size) * srcPng.width))
      const sy = Math.min(srcPng.height - 1, Math.floor((y / size) * srcPng.height))
      const si = (srcPng.width * sy + sx) << 2
      const di = (size * y + x) << 2
      out.data[di] = srcPng.data[si]
      out.data[di + 1] = srcPng.data[si + 1]
      out.data[di + 2] = srcPng.data[si + 2]
      out.data[di + 3] = srcPng.data[si + 3]
    }
  }
  return out
}

function pngToIco(pngBuffers) {
  // ICO with PNG-compressed images (Vista+)
  const count = pngBuffers.length
  const headerSize = 6 + count * 16
  let offset = headerSize
  const entries = []
  for (const buf of pngBuffers) {
    const png = PNG.sync.read(buf)
    const w = png.width >= 256 ? 0 : png.width
    const h = png.height >= 256 ? 0 : png.height
    entries.push({ w, h, size: buf.length, offset, buf })
    offset += buf.length
  }
  const out = Buffer.alloc(offset)
  out.writeUInt16LE(0, 0)
  out.writeUInt16LE(1, 2)
  out.writeUInt16LE(count, 4)
  let entryAt = 6
  for (const e of entries) {
    out.writeUInt8(e.w, entryAt)
    out.writeUInt8(e.h, entryAt + 1)
    out.writeUInt8(0, entryAt + 2)
    out.writeUInt8(0, entryAt + 3)
    out.writeUInt16LE(1, entryAt + 4)
    out.writeUInt16LE(32, entryAt + 6)
    out.writeUInt32LE(e.size, entryAt + 8)
    out.writeUInt32LE(e.offset, entryAt + 12)
    e.buf.copy(out, e.offset)
    entryAt += 16
  }
  return out
}

function writeBmp24(path, width, height, getPixel) {
  const rowSize = Math.floor((width * 3 + 3) / 4) * 4
  const pixelSize = rowSize * height
  const fileSize = 54 + pixelSize
  const buf = Buffer.alloc(fileSize)
  buf.write('BM', 0)
  buf.writeUInt32LE(fileSize, 2)
  buf.writeUInt32LE(54, 10)
  buf.writeUInt32LE(40, 14)
  buf.writeInt32LE(width, 18)
  buf.writeInt32LE(height, 22)
  buf.writeUInt16LE(1, 26)
  buf.writeUInt16LE(24, 28)
  buf.writeUInt32LE(0, 30)
  buf.writeUInt32LE(pixelSize, 34)
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getPixel(x, srcY)
      const i = 54 + y * rowSize + x * 3
      buf[i] = b
      buf[i + 1] = g
      buf[i + 2] = r
    }
  }
  writeFileSync(path, buf)
}

// icon.png (512) for electron-builder + renderer
const icon512 = resizeNearest(src, 512)
const icon512Buf = PNG.sync.write(icon512)
writeFileSync(join(buildDir, 'icon.png'), icon512Buf)
copyFileSync(join(buildDir, 'icon.png'), join(rendererAssets, 'logo.png'))

const sizes = [16, 24, 32, 48, 64, 128, 256]
const pngs = sizes.map((s) => PNG.sync.write(resizeNearest(src, s)))
writeFileSync(join(buildDir, 'icon.ico'), pngToIco(pngs))

// NSIS sidebar: 164×314, branded background + centered logo
const SW = 164
const SH = 314
const logo = resizeNearest(src, 120)
writeBmp24(join(buildDir, 'installerSidebar.bmp'), SW, SH, (x, y) => {
  // deep bg with mint radial glow
  const cx = SW / 2
  const cy = SH * 0.42
  const dx = (x - cx) / SW
  const dy = (y - cy) / SH
  const dist = Math.sqrt(dx * dx + dy * dy)
  const glow = Math.max(0, 1 - dist * 1.8)
  let r = Math.round(7 + glow * 18)
  let g = Math.round(7 + glow * 40)
  let b = Math.round(10 + glow * 28)

  // place logo
  const lx = Math.floor((SW - logo.width) / 2)
  const ly = Math.floor(SH * 0.28)
  if (x >= lx && x < lx + logo.width && y >= ly && y < ly + logo.height) {
    const li = (logo.width * (y - ly) + (x - lx)) << 2
    const a = logo.data[li + 3] / 255
    if (a > 0.05) {
      r = Math.round(r * (1 - a) + logo.data[li] * a)
      g = Math.round(g * (1 - a) + logo.data[li + 1] * a)
      b = Math.round(b * (1 - a) + logo.data[li + 2] * a)
    }
  }

  // mint accent bar at bottom
  if (y > SH - 8) {
    r = 61
    g = 222
    b = 168
  }
  return [r, g, b]
})

console.log('Wrote build/icon.png, build/icon.ico, build/installerSidebar.bmp, src/renderer/src/assets/logo.png')
