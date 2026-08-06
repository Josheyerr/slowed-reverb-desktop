/**
 * Intentional GitHub Release publish only.
 * Requires CONFIRM_PUBLISH=1 so `npm run publish` cannot ship by accident.
 * Loads `.env` / `.env.local` for GH_TOKEN (and optional UPDATE_FEED_TOKEN).
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { loadProjectEnv } from './load-env.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadProjectEnv(root)

if (process.env.CONFIRM_PUBLISH !== '1') {
  console.error(`
Refusing to publish: CONFIRM_PUBLISH is not set to 1.

GitHub Releases / auto-update feeds are only pushed on intentional publish.
Normal builds use:  npm run dist

To publish intentionally (PowerShell):
  $env:CONFIRM_PUBLISH="1"
  npm run publish

See .env.example for optional tokens.
Agents/developers must not run publish unless the user explicitly asks.
`)
  process.exit(1)
}

if (!process.env.GH_TOKEN) {
  // Prefer gh CLI token for publishing if GH_TOKEN unset
  const gh = spawnSync('gh', ['auth', 'token'], {
    cwd: root,
    encoding: 'utf8',
    shell: true
  })
  if (gh.status === 0 && gh.stdout?.trim()) {
    process.env.GH_TOKEN = gh.stdout.trim()
  }
}

if (!process.env.GH_TOKEN) {
  console.error(`
Refusing to publish: GH_TOKEN is missing (needed to upload the GitHub Release).
Set GH_TOKEN in .env, or run: gh auth login
`)
  process.exit(1)
}

process.env.UPDATE_OWNER = process.env.UPDATE_OWNER || 'Josheyerr'
process.env.UPDATE_REPO = process.env.UPDATE_REPO || 'slowed-reverb-desktop'

console.log(
  `Publishing public release to ${process.env.UPDATE_OWNER}/${process.env.UPDATE_REPO}`
)

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: process.env
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL = '9'
process.env.ELECTRON_BUILDER_7Z_FILTER = 'BCJ2'

run('npm', ['run', 'build'])
run('npx', ['electron-builder', '--win', 'nsis', '--publish', 'always'])
