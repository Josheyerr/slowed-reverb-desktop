/**
 * Runs electron-builder with max NSIS/7z compression settings.
 * Usage: node scripts/run-electron-builder.mjs --win nsis --publish never
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)

process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL = '9'
process.env.ELECTRON_BUILDER_7Z_FILTER = 'BCJ2'

const result = spawnSync('npx', ['electron-builder', ...args], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: process.env
})

process.exit(result.status ?? 1)
