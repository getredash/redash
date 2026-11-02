// One-time port of the Netlify redirect rules (kept for review; delete after
// the old site is retired):
//
//   node scripts/migrate-redirects.mjs <getredash/website checkout> <getredash/docs-redirector checkout>
//
// - getredash/website/_redirects → public/_redirects (Cloudflare format).
//   Chains are collapsed so every legacy URL needs one hop, `301!` becomes
//   `301` (Cloudflare redirects always win over files), and each exact source
//   is listed with and without a trailing slash (Cloudflare matches them
//   separately).
// - getredash/docs-redirector/_redirects (docs.redash.io) → infra/docs-redash-io-redirects.csv,
//   for a Cloudflare Bulk Redirect list, also collapsed to final targets.
import fs from 'node:fs'
import path from 'node:path'

const [websiteRepo, redirectorRepo] = process.argv.slice(2)
const root = path.resolve(import.meta.dirname, '..')

const parse = (file) =>
  fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p.length >= 2 && p[0].startsWith('/') && p[1])
    .map(([from, to]) => ({ from, to }))

const strip = (u) => (u.length > 1 ? u.replace(/\/$/, '') : u)
const rules = parse(path.join(websiteRepo, '_redirects'))

// Pages that exist in the new build (dist must be built first).
const dist = path.join(root, 'dist')
const exists = (p) => {
  const clean = decodeURIComponent(p.split('#')[0].split('?')[0])
  return (
    fs.existsSync(path.join(dist, clean, 'index.html')) ||
    (fs.existsSync(path.join(dist, clean)) && fs.statSync(path.join(dist, clean)).isFile())
  )
}

// Final destination of a URL path under the old rules (exact rules first, then splats).
const exact = new Map(rules.filter((r) => !r.from.includes('*')).map((r) => [strip(r.from), r.to]))
const splats = rules.filter((r) => r.from.endsWith('*'))
// Targets that 404 on the old site too; send them somewhere useful.
const fixes = new Map([
  ['/help/faq/hosted-redash', '/help/faq/general/'],
  ['/help/data-sources/querying/jira', '/help/data-sources/querying/jira-ds/'],
  ['/help/data-sources/querying/csv-files', '/help/data-sources/querying/csv-excel-files/'],
  ['/help/user-guide/dashboards/grouping-dashboards', '/help/user-guide/dashboards/dashboard-editing/'],
])

function resolve(url) {
  let u = url.replace(/^https:\/\/redash\.io/, '')
  for (let i = 0; i < 10; i++) {
    if (/^https?:/.test(u)) return u
    const [p, hash] = u.split('#')
    const key = strip(p)
    if (fixes.has(key)) return fixes.get(key)
    let next = exact.get(key)
    if (!next) {
      const s = splats.find((r) => key.startsWith(r.from.slice(0, -1)))
      if (s && !exists(key + '/')) next = s.to.replace(':splat', key.slice(s.from.length - 1))
    }
    if (!next) {
      // Final page: normalise to the trailing-slash URL the site serves.
      const final = key === '/' ? '/' : exists(key + '/') ? key + '/' : p
      return final + (hash ? '#' + hash : '')
    }
    u = next + (hash && !next.includes('#') ? '#' + hash : '')
  }
  throw new Error(`redirect loop at ${url}`)
}

const lines = [
  '# Redirects for redash.io (Cloudflare _redirects format).',
  '# Every legacy URL must reach its final page in one hop: point new rules at',
  '# the final URL (with trailing slash) and update older rules that pointed at',
  '# the page that moved. Cloudflare matches /a and /a/ separately, and',
  '# redirects take precedence over existing pages.',
  '# `pnpm check:redirects` verifies all of this against the build.',
  '',
]
const seen = new Set()
const add = (from, to) => {
  if (seen.has(from) || from === to) return
  seen.add(from)
  lines.push(`${from} ${to} 301`)
}
for (const { from, to } of rules) {
  if (from.includes('*')) continue // splats go last (Cloudflare matches exact rules faster)

  const target = resolve(from)
  if (strip(target.split('#')[0]) === strip(from)) continue // now a real page
  add(strip(from), target)
  if (!from.endsWith('.html') && from !== '/') add(strip(from) + '/', target)
}
lines.push('', '# Contact form (Netlify Forms) replaced by a link to GitHub Discussions.')
add('/contact/thank-you', '/contact/')
add('/contact/thank-you/', '/contact/')
lines.push('', '# Splats last.')
for (const { from, to } of rules.filter((r) => r.from.includes('*'))) add(from, /^https?:/.test(to) ? to : resolve(to))
fs.writeFileSync(path.join(root, 'public/_redirects'), lines.join('\n') + '\n')

// docs.redash.io → Cloudflare Bulk Redirect list (source URL, target URL, status).
const docs = parse(path.join(redirectorRepo, '_redirects'))
const csv = docs
  .filter(({ from }) => from !== '/')
  .map(({ from, to }) => {
    const target = resolve(to)
    return `docs.redash.io${from},${/^https?:/.test(target) ? target : 'https://redash.io' + target},301`
  })
fs.writeFileSync(path.join(root, 'infra/docs-redash-io-redirects.csv'), csv.join('\n') + '\n')

console.log(`public/_redirects: ${seen.size} rules; docs.redash.io: ${csv.length} rules`)
