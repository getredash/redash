# redash.io

The Redash website: marketing pages and the docs at `/help/`.
Built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build),
deployed to Cloudflare as static files.

- **Docs content lives in [`/docs`](../docs)**: see its README for
  how to write docs. This folder is the site that renders it.
- Marketing pages (`src/react/`) are the React components of the previous
  Gatsby site (getredash/website), rendered to static HTML at build time with
  no client-side React. Their Bootstrap 3 styles are in `src/styles/scss/`.
  They're kept pixel-identical to the old site until the redesign.

## Development

`website/` is its own pnpm workspace with its own lockfile, separate from the
Redash app in the repository root.

```sh
cd website
pnpm install
pnpm dev                # http://localhost:4321
pnpm build              # site → dist/
pnpm build:site         # site + all docs versions → dist/ (what CI deploys)
pnpm check:redirects    # after a build: no old URL may break (see below)
pnpm test:visual        # after a build: compare marketing pages with the live site
```

## Layout

| Path | What |
| --- | --- |
| `src/pages/` | Marketing routes (`.astro`), each rendering a page from `src/react/pages/` |
| `src/react/` | Marketing page components ported from the Gatsby site |
| `src/content/` | Data source / integration landing pages and the legal pages (Markdown) |
| `src/data/` | Customers, footer links, contributors |
| `src/lib/kb.mjs` | Docs structure: URL ids, sidebar, versions |
| `src/components/docs/` | Starlight overrides: head tags, category article lists, version switcher |
| `src/plugins/` | Rehype plugins: legacy heading anchors, version-local links |
| `public/` | Static files served as-is, including `_redirects`, `_headers` and legacy `/assets/` |
| `infra/` | Cloudflare configuration that lives outside this deployment (docs.redash.io Bulk Redirects) |
| `scripts/` | Build orchestration, URL checks, one-time migration scripts |
| `tests/visual/` | Visual parity tests against the old site |

## URLs and redirects

URLs must not break. The Redash app links to docs pages and anchors
(`client/app/components/HelpTrigger.jsx`), as do old installs we can't update.
`pnpm check:redirects` verifies against the build that each of these resolves
to a page in at most one redirect:

- every URL of the old site (`tests/fixtures/legacy-urls.txt`)
- every `redash.io` URL hard-coded in this repository, including anchors
- the docs.redash.io redirect list (`infra/docs-redash-io-redirects.csv`)

When you move a page, add a rule to `public/_redirects` pointing to the final
URL, and update older rules that pointed to the old one.

**In-app help drawer.** The Redash app shows `/help/` pages in an iframe.
Pages must stay frameable (`public/_headers`) and keep posting `iframe_url`
messages to the parent (`src/components/IframeBridge.astro`). The old
capitalised heading anchors (`#Value-Source-Options`) are kept by
`src/plugins/rehype-legacy-anchors.mjs`.

## Docs versions

`scripts/build-site.mjs` combines several docs versions, listed in `versions.json`:

| URL | Built from | Switcher label |
|---|---|---|
| `/help/` | `stable.ref`: the latest release's branch | `26.9 (latest)` |
| `/help/next/` | `master` (this checkout) | `Next (unreleased)` |
| `/help/v/<version>/` | each archive's release tag or branch | `<version>` |

Each ref is built with its own `website/` and `docs/`, and only its docs are
merged into the site; the marketing pages always come from `master`. Only
stable is searchable (Pagefind) and in the sitemap. Next and archives are
`noindex`, carry a banner, and point their canonical link at the stable page.
`/help/v/<stable version>/` redirects to `/help/` until that version is archived.

Docs changes land on `master` first. A fix that also applies to the current
release is cherry-picked onto the stable branch, the same way security fixes
are backported; pushing it redeploys the site. Archives aren't updated.

The 26.9 release predates the docs moving into this repository, so its stable
ref is the `docs/v26.9` branch, created from the cutover commit. Until it exists,
local and pull request builds use the current checkout; deploys fail
(`REQUIRE_REFS`), so `/help/` can't silently show unreleased docs.

On a release (e.g. 27.3):
1. Add the old stable to `archives`: `{ "version": "26.9", "ref": "docs/v26.9" }`.
2. Point `stable` at the new release branch: `{ "version": "27.3", "ref": "security/v27.3" }`.

## Deployment

`.github/workflows/website.yml` builds and checks every change to `docs/` or
`website/`. On `master` it deploys `dist/` to Cloudflare as an assets-only
Worker (`wrangler.jsonc`, no Worker script, so free static-asset requests only).
`website-preview.yml` uploads pull request builds as preview versions and
comments the URL. Both need the `CLOUDFLARE_ACCOUNT_ID` repository variable
and the `CLOUDFLARE_API_TOKEN` secret; without them they're skipped.

Analytics: set `PUBLIC_GA_MEASUREMENT_ID` at build time to enable GA4.

## Visual parity tests

`tests/visual/` screenshots every marketing page, plus the navbar menus, on
the reference site (`REFERENCE_URL`, default `https://redash.io`, still the
Gatsby site) and on this build. It does this at desktop, tablet and mobile
widths and fails on any pixel difference. Reference screenshots are cached in
`.vrt-cache/`; set `REFRESH_REFERENCE=1` to retake them. Failures write
`reference.png`, `candidate.png` and `diff.png` to `test-results/`.

Remove these tests (and the CI job) after cutover, when the reference would be
this site itself.
