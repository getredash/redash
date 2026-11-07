// Full production build. Deploy the resulting dist/.
//
//   node scripts/build-site.mjs
//
// - This checkout (master): the marketing pages, plus its docs as "next" at /help/next/.
// - versions.json `stable`: the latest release's docs at /help/, built from its ref.
// - versions.json `archives`: older releases at /help/v/<version>/, built from their refs.
//
// Each ref is built with its own website/ and docs/ (so old docs keep their
// look) and only its docs are merged in. Ref builds are cached in
// .archive-cache/<version>-<sha>/. A ref that can't be found locally is
// fetched from origin; if it doesn't exist (e.g. before the cutover creates
// it), the current checkout is used instead, unless REQUIRE_REFS is set.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const cache = path.join(root, '.archive-cache')
const versions = JSON.parse(fs.readFileSync(path.join(root, 'versions.json'), 'utf8'))
const env = { ...process.env, DOCS_VERSIONS: JSON.stringify(versions) }
const REQUIRE_REFS = ['1', 'true'].includes(process.env.REQUIRE_REFS ?? '')

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', env, ...opts })
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
const tryGit = (...args) => {
  try {
    return git(...args)
  } catch {
    return null
  }
}

/** Commit SHA of a branch or tag, fetching it from origin if needed. */
function resolveRef(ref) {
  const local = tryGit('rev-parse', '--verify', '--quiet', `${ref}^{commit}`)
  if (local) return local
  const remote = tryGit('rev-parse', '--verify', '--quiet', `origin/${ref}^{commit}`)
  if (remote) return remote
  if (tryGit('fetch', '--no-tags', '--depth=1', 'origin', ref) !== null) return git('rev-parse', 'FETCH_HEAD^{commit}')
  if (REQUIRE_REFS) throw new Error(`${ref} not found locally or on origin`)
  console.warn(`⚠ ${ref} not found: using the current checkout instead`)
  return null
}

/** Builds the docs of `ref` at /<base>/ (docs only) and returns the output directory. */
function buildDocs(version, ref, base) {
  const sha = resolveRef(ref)
  const out = path.join(cache, `${version}-${sha ?? 'HEAD'}`)
  if (sha && fs.existsSync(path.join(out, base))) return out
  console.log(`▶ building docs ${version} at /${base}/ (${sha ?? 'current checkout'})`)
  fs.rmSync(out, { recursive: true, force: true })
  const refEnv = { ...env, DOCS_BASE: base, DOCS_ONLY: '1' }
  if (sha) {
    // Check out website/ and docs/ at the ref and build there.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `redash-docs-${version}-`))
    execFileSync('bash', ['-o', 'pipefail', '-c', `git archive ${sha} website docs | tar -x -C "${tmp}"`], {
      cwd: path.resolve(root, '..'),
    })
    run('pnpm', ['install', '--frozen-lockfile'], { cwd: path.join(tmp, 'website') })
    run('pnpm', ['exec', 'astro', 'build', '--outDir', out], { cwd: path.join(tmp, 'website'), env: refEnv })
    fs.rmSync(tmp, { recursive: true, force: true })
  } else {
    run('pnpm', ['exec', 'astro', 'build', '--outDir', out], { cwd: root, env: refEnv })
  }
  return out
}

/** Copies a version's docs and their (content-hashed) assets into dist/. */
function merge(out, base) {
  fs.cpSync(path.join(out, base), path.join(dist, base), { recursive: true })
  fs.cpSync(path.join(out, '_astro'), path.join(dist, '_astro'), { recursive: true, force: false })
  console.log(`✓ merged /${base}/`)
}

console.log('▶ building the site, with next docs at /help/next/')
run('pnpm', ['exec', 'astro', 'build'], { cwd: root, env: { ...env, DOCS_BASE: 'help/next' } })

// Stable: the only searchable version, and the only docs in the sitemap.
const { stable, archives = [] } = versions
const stableOut = buildDocs(stable.version, stable.ref, 'help')
merge(stableOut, 'help')
fs.cpSync(path.join(stableOut, 'pagefind'), path.join(dist, 'pagefind'), { recursive: true })
fs.copyFileSync(path.join(stableOut, 'sitemap-0.xml'), path.join(dist, 'sitemap-help.xml'))
const index = path.join(dist, 'sitemap-index.xml')
fs.writeFileSync(
  index,
  fs
    .readFileSync(index, 'utf8')
    .replace('</sitemapindex>', '<sitemap><loc>https://redash.io/sitemap-help.xml</loc></sitemap></sitemapindex>')
)

for (const { version, ref } of archives) merge(buildDocs(version, ref, `help/v/${version}`), `help/v/${version}`)

// The stable version also has a /help/v/<version>/ URL (for links to "the
// 26.9 docs" that keep working once it is archived); until then, redirect it.
if (!archives.some((a) => a.version === stable.version)) {
  fs.appendFileSync(
    path.join(dist, '_redirects'),
    `\n# Stable docs version (added by scripts/build-site.mjs)\n` +
      `/help/v/${stable.version} /help/ 302\n/help/v/${stable.version}/* /help/:splat 302\n`
  )
}
