/**
 * Load KEY=VALUE pairs from a .env file into process.env (does not override existing).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return false
  const text = readFileSync(filePath, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
  return true
}

export function loadProjectEnv(rootDir) {
  const root = rootDir || process.cwd()
  loadEnvFile(resolve(root, '.env'))
  loadEnvFile(resolve(root, '.env.local'))
}
