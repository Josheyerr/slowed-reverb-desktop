import { writeFile } from 'fs/promises'
import { join } from 'path'

export type SsstikResult = {
  filePath: string
  title: string
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const sanitizeTitle = (title: string): string =>
  title
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'TikTok audio'

const parseSsstikHtml = (
  html: string
): { title: string; musicUrl: string | null; videoUrl: string | null } => {
  if (!html.trim()) {
    throw new Error('ssstik: empty response (rate limited)')
  }
  if (/Video currently unavailable|serious problem/i.test(html)) {
    throw new Error('ssstik: video currently unavailable')
  }

  const title =
    html.match(/class="maintext"[^>]*>([^<]+)/i)?.[1]?.trim() ||
    html.match(/<p class="maintext">([^<]+)/i)?.[1]?.trim() ||
    'TikTok audio'

  const hrefs = Array.from(
    html.matchAll(/href="(https:\/\/tikcdn\.io\/[^"]+)"/gi)
  ).map((m) => m[1])
  const musicUrl =
    hrefs.find((h) => /\/ssstik\/m\//i.test(h) || /mp3/i.test(h)) || null
  const videoUrl =
    hrefs.find((h) => h !== musicUrl && /\/ssstik\//i.test(h)) ||
    hrefs[0] ||
    null

  if (!musicUrl && !videoUrl) {
    throw new Error('ssstik: no download links in response')
  }

  return { title, musicUrl, videoUrl }
}

const downloadBytes = async (mediaUrl: string): Promise<Buffer> => {
  const res = await fetch(mediaUrl, {
    headers: {
      'User-Agent': UA,
      Referer: 'https://ssstik.io/',
      Origin: 'https://ssstik.io'
    }
  })
  if (!res.ok) {
    throw new Error(`ssstik media HTTP ${res.status}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.byteLength) {
    throw new Error('ssstik media empty')
  }
  return buf
}

const requestSsstikHtml = async (url: string): Promise<string> => {
  // Warm homepage (sets up session / htmx flow)
  await fetch('https://ssstik.io/', {
    headers: { 'User-Agent': UA, Accept: 'text/html' }
  }).catch(() => null)

  const res = await fetch('https://ssstik.io/abc?url=dl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': UA,
      Origin: 'https://ssstik.io',
      Referer: 'https://ssstik.io/',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: `id=${encodeURIComponent(url)}&locale=en&tt=0`
  })
  return res.text()
}

/**
 * Resolve TikTok audio via ssstik.io (no login / no cookies / no yt-dlp).
 * Uses backoff between attempts — rapid retries return empty HTML.
 */
export const downloadTikTokViaSsstik = async (
  url: string,
  outDir: string
): Promise<SsstikResult> => {
  const delaysMs = [0, 4000, 8000, 12000]
  let lastErr: unknown = null

  for (let attempt = 0; attempt < delaysMs.length; attempt++) {
    if (delaysMs[attempt] > 0) await sleep(delaysMs[attempt])
    try {
      const html = await requestSsstikHtml(url)
      const parsed = parseSsstikHtml(html)
      const mediaUrl = parsed.musicUrl || parsed.videoUrl
      if (!mediaUrl) throw new Error('ssstik: missing media url')

      const buf = await downloadBytes(mediaUrl)
      const title = sanitizeTitle(parsed.title)
      const isMp3 =
        buf.slice(0, 3).toString() === 'ID3' ||
        (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) ||
        /\/m\//.test(mediaUrl)
      const ext = isMp3 ? 'mp3' : 'mp4'
      const filePath = join(outDir, `${title}.${ext}`)
      await writeFile(filePath, buf)
      return { filePath, title }
    } catch (err) {
      lastErr = err
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error('ssstik download failed')
}
