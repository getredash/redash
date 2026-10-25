// Full production build: the site from this checkout, plus each archived docs
// version from versions.json, built from its git ref and merged in at
// /help/v/<version>/. Deploy the resulting dist/.
//
//   node scripts/build-site.mjs
//
// Archive builds are cached in .archive-cache/<version>-<sha>/. If an archive's
// ref doesn't exist yet (e.g. in the PR that adds it), it is built from the
// current checkout instead.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const cache = path.join(root, '.archive-cache')
const { archives } = JSON.parse(fs.readFileSync(path.join(root, 'versions.json'), 'utf8'))
const env = { ...process.env, DOCS_VERSIONS: JSON.stringify(archives) }

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', env, ...opts })
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()

console.log('▶ building the site')
run('pnpm', ['exec', 'astro', 'build'], { cwd: root })

for (const { version, ref } of archives) {
  const base = `help/v/${version}`
  let sha
  try {
    sha = git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`)
  } catch {
    console.warn(`⚠ ${ref} not found: building the ${version} archive from the current checkout`)
  }
  const out = path.join(cache, `${version}-${sha ?? 'HEAD'}`)
  if (!sha || !fs.existsSync(path.join(out, base))) {
    console.log(`▶ building docs ${version} (${sha ?? 'current checkout'})`)
    fs.rmSync(out, { recursive: true, force: true })
    const archiveEnv = { ...env, DOCS_BASE: base }
    if (sha) {
      // Check out website/ and docs/ at the ref and build there.
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `redash-docs-${version}-`))
      execFileSync('bash', ['-o', 'pipefail', '-c', `git archive ${sha} website docs | tar -x -C "${tmp}"`], {
        cwd: path.resolve(root, '..'),
      })
      run('pnpm', ['install', '--frozen-lockfile'], { cwd: path.join(tmp, 'website') })
      run('pnpm', ['exec', 'astro', 'build', '--outDir', out], { cwd: path.join(tmp, 'website'), env: archiveEnv })
      fs.rmSync(tmp, { recursive: true, force: true })
    } else {
      run('pnpm', ['exec', 'astro', 'build', '--outDir', out], { cwd: root, env: archiveEnv })
    }
  }
  // Keep only the archived docs and their (content-hashed) assets.
  fs.cpSync(path.join(out, base), path.join(dist, base), { recursive: true })
  fs.cpSync(path.join(out, '_astro'), path.join(dist, '_astro'), { recursive: true, force: false })
  console.log(`✓ merged ${base}`)
}
