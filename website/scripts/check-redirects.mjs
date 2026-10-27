// Verifies that no URL breaks, against the built site (run after `pnpm build`).
// Simulates Cloudflare: _redirects rules first (they win over files), then
// files, then the automatic `/page` → `/page/` redirect for directories.
//
// Checked URLs:
// - tests/fixtures/legacy-urls.txt: every URL of the old Gatsby site
// - redash.io URLs hard-coded anywhere in this repository (Redash app help
//   links, error messages, emails), including HelpTrigger.jsx paths and #anchors
// - infra/docs-redash-io-redirects.csv targets (docs.redash.io Bulk Redirects)
//
// Each must reach a page in at most one redirect from _redirects; anchors must
// exist on the final page. Redirect rules must not shadow real pages.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const repo = path.resolve(root, '..')
const dist = path.join(root, 'dist')
if (!fs.existsSync(dist)) throw new Error('dist/ not found: run `pnpm build` first')

const rules = fs
  .readFileSync(path.join(dist, '_redirects'), 'utf8')
  .split('\n')
  .filter((l) => l.trim() && !l.startsWith('#'))
  .map((l) => {
    const [from, to, status] = l.trim().split(/\s+/)
    return { from, to, status }
  })

const fileAt = (p) => {
  const f = path.join(dist, decodeURIComponent(p))
  return fs.existsSync(f) && fs.statSync(f).isFile() ? f : null
}
const pageAt = (p) => fileAt(p.endsWith('/') ? p + 'index.html' : p) ?? (p.endsWith('/') ? null : fileAt(p + '.html'))

/** One request: { status: 200, file } | { status: 301|308, location, rule } | { status: 404 } */
function request(p) {
  for (const r of rules) {
    if (r.from.endsWith('*') ? p.startsWith(r.from.slice(0, -1)) : p === r.from) {
      const splat = r.from.endsWith('*') ? p.slice(r.from.length - 1) : ''
      return { status: Number(r.status ?? 301), location: r.to.replace(':splat', splat), rule: true }
    }
  }
  const file = pageAt(p)
  if (file) return { status: 200, file }
  if (!p.endsWith('/') && fileAt(p + '/index.html')) return { status: 308, location: p + '/', rule: false }
  return { status: 404 }
}

const problems = []
function check(url, source) {
  const [p, hash] = url.split('#')
  let current = p
  let ruleHops = 0
  for (let i = 0; i < 5; i++) {
    const res = request(current)
    if (res.status === 200) {
      if (ruleHops > 1) problems.push(`${url} (${source}): ${ruleHops} redirects, collapse the chain`)
      if (hash) {
        const html = fs.readFileSync(res.file, 'utf8')
        if (!html.includes(`id="${hash}"`)) problems.push(`${url} (${source}): anchor #${hash} not found on ${current}`)
      }
      return
    }
    if (res.status === 404) return problems.push(`${url} (${source}): 404 at ${current}`)
    if (res.rule) ruleHops++
    if (/^https?:\/\//.test(res.location)) return // external target (forum, GitHub)
    current = res.location.split('#')[0]
  }
  problems.push(`${url} (${source}): redirect loop`)
}

// 1. URLs of the old site.
for (const line of fs.readFileSync(path.join(root, 'tests/fixtures/legacy-urls.txt'), 'utf8').split('\n')) {
  if (line && !line.startsWith('#')) check(line.trim(), 'legacy site')
}

// 2. redash.io URLs hard-coded in the repository.
const grep = (pattern, files = []) => {
  try {
    return execFileSync('git', ['grep', '-h', '-o', '-E', pattern, '--', ...files], { cwd: repo, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
  } catch {
    return []
  }
}
const repoUrls = grep("https?://redash\\.io/[^] )\"'<>`]*", [':!website', ':!docs', ':!*.lock'])
  .map((u) => u.replace(/^https?:\/\/redash\.io/, '').replace(/[.,;:]+$/, ''))
const helpTrigger = grep('\\["/[^"]*",', ['client/app/components/HelpTrigger.jsx']).map(
  (m) => '/help' + m.slice(2, -2)
)
for (const u of new Set([...repoUrls, ...helpTrigger])) check(u.split('?')[0] || '/', 'Redash repo')

// 3. docs.redash.io Bulk Redirect targets.
for (const line of fs.readFileSync(path.join(root, 'infra/docs-redash-io-redirects.csv'), 'utf8').split('\n')) {
  const target = line.split(',')[1]
  if (target?.startsWith('https://redash.io/')) {
    const p = target.slice('https://redash.io'.length)
    if (request(p).status !== 200) problems.push(`${line.split(',')[0]} → ${p}: not a page`)
  }
}

// 4. Rule hygiene: no rule shadows a page, every target is final.
for (const r of rules) {
  if (!r.from.includes('*') && pageAt(r.from)) problems.push(`rule ${r.from} shadows an existing page`)
  // Splat targets are checked through the URLs above.
  if (!/^https?:/.test(r.to) && !r.to.includes(':splat') && request(r.to.split('#')[0]).status !== 200)
    problems.push(`rule ${r.from} → ${r.to}: target is not a page (point it at the final URL)`)
}

console.log(`checked ${rules.length} rules, legacy URLs, ${repoUrls.length + helpTrigger.length} repo URLs`)
if (problems.length) {
  console.error(problems.map((p) => '  ✗ ' + p).join('\n'))
  process.exit(1)
}
console.log('✓ all URLs resolve')
