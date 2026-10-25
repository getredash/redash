# redash.io

The Redash website: marketing pages and the knowledge base at `/help/`.
Built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build),
deployed to Cloudflare as static files.

- **Knowledge base content lives in [`/docs`](../docs)**: see its README for
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
pnpm build:site         # site + archived docs versions → dist/ (what CI deploys)
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
| `src/lib/kb.mjs` | Knowledge base structure: URL ids, sidebar, versions |
| `src/components/docs/` | Starlight overrides: head tags, category article lists, version switcher |
| `src/plugins/` | Rehype plugins: legacy heading anchors, version-local links |
| `public/` | Static files served as-is, including `_redirects`, `_headers` and legacy `/assets/` |
| `infra/` | Cloudflare configuration that lives outside this deployment (docs.redash.io Bulk Redirects) |
| `scripts/` | Build orchestration, URL checks, one-time migration scripts |
| `tests/visual/` | Visual parity tests against the old site |

## URLs and redirects

URLs must not break. The Redash app links to knowledge base pages and anchors
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

`/help/` is the latest documentation, built from the current checkout.
Archived versions listed in `versions.json` are built from their git refs by
`scripts/build-site.mjs` and served at `/help/v/<version>/`. They're
`noindex`, carry a banner and canonical link to the latest page, and appear in
the version switcher. To archive a release, tag the commit (`docs/v<version>`)
and add it to `versions.json`.

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
