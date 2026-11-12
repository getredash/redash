// One-time conversion of the Gatsby site's knowledge base (getredash/website,
// src/pages/kb) into /docs. Kept for review of the migration; delete after
// the old site is retired.
//
//   node scripts/migrate-kb.mjs <path-to-getredash-website-checkout>
//
// - The URL comes from frontmatter (parent_category/category/slug) on the old
//   site; here it comes from the file path, so files are placed at
//   docs/<parent>/<category>[/<slug>].md (category pages with articles become
//   <category>/index.md).
// - Liquid tags the old site rewrote at runtime are converted:
//   {% callout [type] %}…{% endcallout %} → Starlight asides,
//   [text]({% link _kb/… %}) → the page's final URL, {% raw %} → code fence.
import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'

const oldRoot = process.argv[2]
if (!oldRoot) throw new Error('usage: migrate-kb.mjs <getredash/website checkout>')
const kbDir = path.join(oldRoot, 'src/pages/kb')
const outDir = path.resolve(import.meta.dirname, '../../docs')

// Old _redirects, used to resolve links to their final target.
const redirects = new Map(
  fs
    .readFileSync(path.join(oldRoot, '_redirects'), 'utf8')
    .split('\n')
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p.length >= 2 && p[0].startsWith('/'))
    .map(([from, to]) => [from.replace(/\/$/, ''), to])
)

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name)
    return d.isDirectory() ? walk(p) : p.endsWith('.md') ? [p] : []
  })

const pages = walk(kbDir).map((file) => {
  const src = fs.readFileSync(file, 'utf8')
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/)
  const fm = YAML.parse(m[1])
  const body = src.slice(m[0].length)
  const urlPath = [fm.parent_category, fm.category, fm.slug].filter(Boolean).join('/')
  return { file, fm, body, urlPath }
})
const urls = new Set(pages.map((p) => p.urlPath))
const hasChildren = (p) => pages.some((q) => q !== p && q.urlPath.startsWith(p.urlPath + '/'))

function resolveLink(target) {
  // Same rewrite the old site did at runtime, then follow redirects.
  let url = target.replace(/^_kb/, '/help').replace(/\.md$/, '').replace(/\/$/, '')
  for (let i = 0; i < 10 && redirects.has(url); i++) url = redirects.get(url).replace(/\/$/, '')
  const [p, hash] = url.split('#')
  const known = p === '/help' || urls.has(p.replace(/^\/help\//, ''))
  if (!known && !/^https?:/.test(p)) console.warn(`  unresolved link: ${target} → ${url}`)
  return /^https?:/.test(p) ? url : `${p}/${hash ? '#' + hash : ''}`
}

const ASIDE = { undefined: 'note', primary: 'note', info: 'note', warning: 'caution', danger: 'danger', important: 'caution' }

function convertBody(body, title) {
  const out = []
  for (const line of body.split('\n')) {
    if (!/\{%\s*(end)?callout/.test(line)) {
      out.push(line)
      continue
    }
    // Put every callout tag on its own line, keeping the indentation so
    // callouts inside list items stay inside them.
    const indent = line.match(/^\s*/)[0]
    for (const part of line.trim().split(/(\{%\s*callout(?:\s+\w+)?\s*%\}|\{%\s*endcallout\s*%\})/)) {
      const open = part.match(/^\{%\s*callout(?:\s+(\w+))?\s*%\}$/)
      if (open) out.push('', indent + ':::' + ASIDE[open[1]], '')
      else if (/^\{%\s*endcallout\s*%\}$/.test(part)) out.push('', indent + ':::', '')
      else if (part.trim()) out.push(indent + part.trim())
    }
  }
  let s = out.join('\n')
  s = s.replace(/\{%\s*link\s+([^\s%]+)\s*%\}/g, (_, t) => resolveLink(t))
  s = s.replace(/\{%\s*raw\s*%\}\n?/g, '```sql\n').replace(/\n?\{%\s*endraw\s*%\}/g, '\n```')
  s = s.replace(/^`video:\s*(\S+)`$/gm, '<video src="$1" controls muted loop playsinline width="100%"></video>')
  // Starlight renders the title as the page's <h1>; drop a duplicate first heading.
  s = s.replace(/^\s*#\s+(.+)\n/, (h, text) => (text.trim() === title.trim() ? '' : h))
  s = demoteH1Sections(s)
  return s.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\s*$/, '\n')
}

// Some articles use `#` for their sections. Under Starlight's page title these
// would be extra <h1>s (and missing from the table of contents), so shift all
// headings down a level on such pages. Code fences are left alone.
function demoteH1Sections(s) {
  const lines = s.split('\n')
  let fence = false
  const isHeading = lines.map((l) => {
    if (/^\s*(```|~~~)/.test(l)) fence = !fence
    return !fence && /^#{1,5}\s/.test(l)
  })
  if (!lines.some((l, i) => isHeading[i] && /^#\s/.test(l))) return s
  return lines.map((l, i) => (isHeading[i] ? '#' + l : l)).join('\n')
}

fs.rmSync(outDir, { recursive: true, force: true })
for (const page of pages) {
  const { fm } = page
  const rel = page.urlPath + (hasChildren(page) ? '/index.md' : '.md')
  const data = { title: fm.title }
  if (fm.description) data.description = fm.description
  if (fm.keywords) data.keywords = Array.isArray(fm.keywords) ? fm.keywords : [fm.keywords]
  if (fm.order !== undefined && fm.order !== null) data.sidebar = { order: Number(fm.order) }
  const out = `---\n${YAML.stringify(data).trim()}\n---\n\n${convertBody(page.body, fm.title)}`
  fs.mkdirSync(path.dirname(path.join(outDir, rel)), { recursive: true })
  fs.writeFileSync(path.join(outDir, rel), out)
}
console.log(`wrote ${pages.length} pages to ${path.relative(process.cwd(), outDir)}`)
