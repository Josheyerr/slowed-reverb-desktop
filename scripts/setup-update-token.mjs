/**
 * Interactive helper: open GitHub fine-grained PAT page and save UPDATE_FEED_TOKEN to .env
 * Usage: npm run setup:update-token
 */
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { verifyUpdateFeedAccess } from './verify-update-token.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env')
const tokenUrl =
  'https://github.com/settings/personal-access-tokens/new'

console.log(`
 lasting auto-update token setup
=================================
Create a fine-grained personal access token with:

  Token name:     slowed-reverb-desktop-updates
  Expiration:     90 days (or custom — rotate before it expires)
  Resource owner: Josheyerr
  Repository:     Only select → slowed-reverb-desktop  (MUST include this PRIVATE repo)
  Permissions:    Contents = Read-only
                  Metadata = Read-only (automatic)

IMPORTANT: "Public repositories" only will NOT work — this repo is private.

Opening the token creation page in your browser…
`)

const openCmd =
  process.platform === 'win32'
    ? spawn('cmd', ['/c', 'start', '', tokenUrl], { detached: true, stdio: 'ignore' })
    : spawn('xdg-open', [tokenUrl], { detached: true, stdio: 'ignore' })
openCmd.unref()

const rl = createInterface({ input, output })
const token = (await rl.question('Paste the new token here (github_pat_…): ')).trim()
rl.close()

if (!token || (!token.startsWith('github_pat_') && !token.startsWith('ghp_'))) {
  console.error('Aborted: expected a GitHub PAT starting with github_pat_ or ghp_')
  process.exit(1)
}

const access = await verifyUpdateFeedAccess({
  token,
  owner: 'Josheyerr',
  repo: 'slowed-reverb-desktop'
})
if (!access.ok) {
  console.error(`
Token saved check FAILED — cannot see private repo/releases.
  repo: ${access.repoStatus}  latest: ${access.latestStatus}

Recreate the token with Repository access = Only select → slowed-reverb-desktop
(not Public repositories only).
`)
  process.exit(1)
}
console.log('Token access check OK (repo + latest release visible).')

let existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
const lines = existing
  ? existing.split(/\r?\n/).filter((l) => !/^\s*UPDATE_FEED_TOKEN\s*=/.test(l))
  : [
      '# Local secrets — never commit',
      'UPDATE_OWNER=Josheyerr',
      'UPDATE_REPO=slowed-reverb-desktop',
      ''
    ]

if (!lines.some((l) => /^\s*UPDATE_OWNER\s*=/.test(l))) {
  lines.push('UPDATE_OWNER=Josheyerr')
}
if (!lines.some((l) => /^\s*UPDATE_REPO\s*=/.test(l))) {
  lines.push('UPDATE_REPO=slowed-reverb-desktop')
}
lines.push(`UPDATE_FEED_TOKEN=${token}`)
if (!existing.endsWith('\n') && existing) lines.unshift('')

writeFileSync(envPath, `${lines.filter(Boolean).join('\n')}\n`, 'utf8')
console.log(`
Saved UPDATE_FEED_TOKEN to .env (gitignored).

Next (when you want a lasting auto-update build on GitHub Releases):
  1. Bump version in package.json if needed
  2. $env:CONFIRM_PUBLISH="1"; npm run publish
`)
