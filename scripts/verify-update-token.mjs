/**
 * Verify UPDATE_FEED_TOKEN can see the private repo + latest release.
 * Returns { ok, repoStatus, latestStatus } — never logs the token.
 */
export async function verifyUpdateFeedAccess({
  token,
  owner,
  repo
}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'slowed-reverb-token-check',
    'X-GitHub-Api-Version': '2022-11-28'
  }
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers
  })
  const latestRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
    { headers }
  )
  return {
    ok: repoRes.status === 200 && latestRes.status === 200,
    repoStatus: repoRes.status,
    latestStatus: latestRes.status
  }
}
