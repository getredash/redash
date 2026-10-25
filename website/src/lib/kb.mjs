// Knowledge base structure, shared by astro.config.mjs (sidebar) and the docs
// components (category article lists, /help/ index). Content lives in /docs at
// the repository root; docs/<path>.md is served at /<DOCS_BASE>/<path>/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'

export const DOCS_DIR = fileURLToPath(new URL('../../../docs', import.meta.url))

// URL prefix of the docs: `help` normally; e.g. `help/v/26.9` for archived versions.
export const DOCS_BASE = (process.env.DOCS_BASE ?? 'help').replace(/^\/|\/$/g, '')
export const LATEST_BASE = 'help'
export const IS_ARCHIVE = DOCS_BASE !== LATEST_BASE

// Version switcher entries, from DOCS_VERSIONS (JSON list of archives). The
// Astro config sets it from versions.json; scripts/build-site.mjs passes the
// current checkout's list to archive builds of older refs.
export function getVersions() {
  const archives = JSON.parse(process.env.DOCS_VERSIONS || '[]')
  return [
    { label: 'Latest', base: LATEST_BASE },
    ...archives.map(({ version }) => ({ label: version, base: `help/v/${version}` })),
  ]
}

/** The same page in another docs version: /help/v/26.9/x/ → /help/x/. */
export function pathInVersion(pathname, base) {
  const current = '/' + DOCS_BASE + '/'
  return pathname.startsWith(current) ? `/${base}/` + pathname.slice(current.length) : `/${base}/`
}

// Top-level sections of the knowledge base, in display order.
export const SECTIONS = [
  { slug: 'user-guide', label: 'User Guide' },
  { slug: 'data-sources', label: 'Data Sources' },
  { slug: 'faq', label: 'FAQ' },
  { slug: 'open-source', label: 'Open Source & Self Hosted' },
]

/** Entry id for a docs file path relative to /docs: `user-guide/alerts/index.md` → `help/user-guide/alerts`. */
export function docId(relPath) {
  const p = relPath
    .replace(/\\/g, '/')
    .replace(/\.mdx?$/, '')
    .replace(/(^|\/)index$/, '')
  return p ? `${DOCS_BASE}/${p}` : DOCS_BASE
}

const byOrder = (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.title.localeCompare(b.title)

/** All docs pages: { id, rel, title, order }. */
export function readDocs() {
  const out = []
  const walk = (dir) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name)
      if (d.isDirectory()) walk(p)
      else if (/\.mdx?$/.test(d.name) && !d.name.startsWith('_') && d.name !== 'README.md') {
        const src = fs.readFileSync(p, 'utf8')
        const fm = YAML.parse(src.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '') ?? {}
        const rel = path.relative(DOCS_DIR, p)
        out.push({ id: docId(rel), rel, title: fm.title, order: fm.sidebar?.order })
      }
    }
  }
  walk(DOCS_DIR)
  return out
}

/** Direct children of a page id, sorted like the old site (order, then title). */
export function childrenOf(docs, id) {
  const depth = id.split('/').length + 1
  return docs.filter((d) => d.id.startsWith(id + '/') && d.id.split('/').length === depth).sort(byOrder)
}

/** Starlight sidebar: sections → categories → articles. */
export function buildSidebar() {
  const docs = readDocs()
  return SECTIONS.map((section) => ({
    label: section.label,
    items: childrenOf(docs, `${DOCS_BASE}/${section.slug}`).map((category) => {
      const articles = childrenOf(docs, category.id)
      if (!articles.length) return { slug: category.id }
      return {
        label: category.title,
        collapsed: true,
        items: [{ slug: category.id, label: 'Overview' }, ...articles.map((a) => ({ slug: a.id }))],
      }
    }),
  }))
}
