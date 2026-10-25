# Redash Website & Knowledge Base Migration Plan

Status: **Phase 1 implemented on a branch** (see Implementation status). Nothing has been pushed or changed in hosting.
Written 2026-10-25 from `getredash/website` @ `b1e4c83`, `getredash/docs-redirector`
@ HEAD, this monorepo @ `f3ebcc4bc`, and live checks against redash.io.
**Revision 2 (2026-10-25):** updated with Arik's answers to the first round of open
questions. They are summarised in §12, and the plan below reflects them throughout.

## Implementation status (branch `website/astro-migration`, 2026-10-25)

Phase 1 is implemented and verified locally. Nothing is deployed, and DNS and
hosting are unchanged.

| Item | Status |
|---|---|
| Marketing site, pixel-identical to the old site | ✅ All 49 pages plus navbar menus match the live redash.io pixel for pixel at 1280, 800 and 375 px (`pnpm test:visual`, 150 checks) |
| Knowledge base in `/docs`, rendered by Starlight at the same URLs | ✅ 79 pages + `/help/` index; Pagefind search; sidebar in the old order |
| In-app help drawer (iframe, `iframe_url` messages, drawer mode, `#Legacy-Anchors`) | ✅ Verified in a framed page; anchors now work without JS |
| Redirects (`_redirects`, chains collapsed) + docs.redash.io Bulk Redirect CSV | ✅ `pnpm check:redirects` passes; behaviour checked with `wrangler dev` |
| Versioning groundwork: `/help/v/26.9/` archive, switcher, noindex/canonical | ✅ Built from git ref `docs/v26.9` (to tag at merge; falls back to HEAD until then) |
| CI: `changes` gate in Tests, `website.yml`, `website-preview.yml` | ✅ actionlint-clean; deploy jobs skip until `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` exist |
| Root `netlify.toml` (dead app previews) | ✅ Removed |
| GA4 | ⏸ Component ready, off until `PUBLIC_GA_MEASUREMENT_ID` is set (follow-up) |
| Cloudflare project, token, DNS cutover, docs.redash.io Bulk Redirects | ⏳ Phase 0/2 (needs Arik) |

Deviations from the plan below, and why:
- **Marketing pages reuse the Gatsby site's React components** (rendered to
  static HTML, no client React) instead of being rewritten as `.astro`. This
  was the only reliable way to get exact parity. The redesign will replace them.
- **React is pinned to 18.3.1**, like the old site. React 19 omits `src=""`, which
  changes layout on `/customers/`.
- **`website/` is its own pnpm workspace** (`website/pnpm-workspace.yaml`,
  with `shamefullyHoist` so Astro's prerender bundle doesn't resolve packages
  from the root `node_modules`).
- **Existing KB images keep their `/assets/images/docs/...` URLs** in
  `website/public/` instead of being co-located in `/docs`. That preserves
  hotlinks and keeps the migration diff reviewable. New images can be co-located.
- **Archived versions have no search of their own.** Pagefind indexes the latest
  docs only.
- Cloudflare's automatic `/page` → `/page/` redirect is a **307** (Netlify
  used 301). Sitemap and canonical URLs use the slash form, so impact should be nil.
- Two redirect targets that 404 on the live site today are fixed
  (`…/csv-files`, `…/grouping-dashboards`), along with `/help/data-sources/querying/jira`
  and `/help/faq/hosted-redash/`.

---

## 0. TL;DR

| Decision | Recommendation |
|---|---|
| 1. Monorepo? | **Yes.** Docs content goes in a top-level **`/docs`** folder (plain Markdown, what contributors see). The Astro/Starlight site that renders it, plus the marketing pages, goes in **`/website`**. Both live in `getredash/redash`. Use a separate lockfile, path-gated CI and no git history import. Archive `getredash/website` read-only. The full trade-off analysis is in §2. |
| 2. Stack | **Astro + Starlight.** Starlight handles `/help`. Plain Astro pages and content collections handle marketing and data-source pages. Pagefind for search, with Algolia DocSearch as an optional later upgrade. |
| 3. Hosting | **Cloudflare, free tier only**, with builds in GitHub Actions and deploys via `wrangler`. Cloudflare now points new projects at Workers Static Assets; Pages direct-upload is a fine fallback. Use no Worker script, no R2 and no paid add-ons, so every request stays on the free, unmetered static-asset path. **Not GitHub Pages**, because it has no server-side 301s, no custom headers and no PR previews. |
| Versioning | **Confirmed scope: stable + next + archives, with a frozen 26.9 archive.** Phase 1 (cutover): a single docs tree at `/help/`, plus `/help/v/26.9/` frozen from the migrated content. Phase 2 (next release): versions built from git refs. Stable `/help/` comes from the latest release tag, `/help/next/` from `master` (noindex), and archives from older refs. Docs content is never copied between versions in the repo. |
| Analytics | **Drop Segment.** Keep Search Console. How GA is wired after Segment is **TBD, to follow up** (§1.6, §11). |
| Contact form | Replace the Netlify Form with a **static contact page that links to GitHub Discussions** (no email, no backend, no cost; §1.6). |
| Effort | About **7–11 working days** for one engineer to reach a like-for-like cutover. Add about 2–3 days for Phase 2 versioning. The redesign is separate. |

Two hard constraints shape everything below:

1. **`https://redash.io/help/...` must keep working forever, on the `redash.io` host.**
   Every deployed Redash instance, including years-old self-hosted ones, hardcodes these URLs.
   The in-app help drawer (`client/app/components/HelpTrigger.jsx`) loads them in an
   iframe. The app's CSP is `frame-src redash.io` (`redash/settings/__init__.py:118`). So the
   docs cannot move to `docs.redash.io`, and the site must keep allowing itself to be framed.
2. **The site has an iframe/postMessage contract with the app.** It must keep posting
   `{type: "iframe_url", message: location.href}` to `window.parent`, and keep applying the
   `drawer` body class (which hides the header and footer) when it is framed. It must also
   keep the **capitalised, hyphenated heading anchors** that the app deep-links to, such as
   `#Value-Source-Options` (see §5.3).

---

## 1. Inventory of the current site

### 1.1 Stack & build
- **Gatsby 5.14** with React 18, plus `gatsby-plugin-preact`, `react-helmet`, Bootstrap 3 SASS
  (`bootstrap-sass`, `node-sass`), FontAwesome, `animate.css` and `emergence.js`.
- Markdown goes through `gatsby-transformer-remark` with these plugins: video, external-links
  (`target=_blank rel=nofollow`), images (max 750px, sharp), responsive-iframe, prismjs,
  copy-linked-files and smartypants. YAML and JSON transformers handle data.
- Other plugins: sitemap (`/sitemap-index.xml` → `/sitemap-0.xml`), twitter, catch-links,
  remove-serviceworker, and `gatsby-plugin-netlify` (emits `_headers`).
  `gatsby-plugin-feed` is installed but **`/rss.xml` returns 404**, so there is no feed.
- Build: `gatsby build && cp _redirects public/`, on Netlify (`netlify.toml`). There is no CI
  besides Netlify, plus a Renovate config. Local dev uses Yarn 1 or Docker.
- Activity is low. There were 6 commits in the last 12 months, mostly "list release X on the
  upgrade page" and typo fixes.

### 1.2 Pages (131 URLs in the live sitemap)
| Type | Count | Source | Template |
|---|---|---|---|
| KB / help articles | **79** (65 articles + 14 `kb-category` index pages) | `src/pages/kb/**.md` | `HelpArticle.jsx`. URL = `/help/{parent_category}/{category}/{slug}` |
| ↳ user-guide | 42 | alerts, dashboards, querying, users, visualizations, integrations-and-api, getting-started | |
| ↳ data-sources | 19 | querying/setup guides per source | |
| ↳ open-source | 15 | setup, admin-guide (env vars, upgrade, SSL, LDAP, secrets, usage-data, maintenance), dev-guide | |
| ↳ faq | 3 | | |
| Data-source landing pages (SEO) | 29 + 3 partners | `src/pages/data_sources/**.md` (frontmatter only: name, logo, path) | `DataSourcePage.jsx` → `/data-sources/<x>/` |
| Integration pages | 8 | `src/pages/data_sources/_integrations` | `/integrations/<x>` |
| Hand-built React pages | ~14 | `index`, `product`, `customers`, `case-studies` (+3), `community`, `about`, `contact` (+thank-you), `integrations`, `help` | JSX |
| Text pages | 3 | `privacy`, `terms`, `code_of_conduct` (md) | `TextPage` / `NarrowTextPage` |

There is **no blog** on the site today, and blog.redash.io does not resolve. Whether to add
one is **undecided**: the plan keeps the option open (§6.2) but doesn't build it. There is
**no i18n content**: the textlint Japanese rules in `package.json` are leftovers, and every
page is English.

### 1.3 Content formats & quirks to convert
- 122 `.md` files and 0 MDX. Frontmatter: `title, category, parent_category, slug, order,
  layout, toc (29), keywords, description, helpscout_url (25)`. The KB sidebar and ordering
  come from `category` + `parent_category` + `order` + `src/data/kb_sections.yml`.
- **Leftover Jekyll Liquid tags**, rewritten at runtime by regex in `HelpArticle.jsx`:
  - `{% callout [info|warning|danger|important] %}…{% endcallout %}`: 104 pairs →
    Starlight `:::note/:::caution/:::danger` asides.
  - `[text]({% link _kb/path/file.md %})`: 51 → plain relative links. These become checkable
    by `starlight-links-validator`.
  - `{% raw %}…{% endraw %}`: 1 → a code fence.
- **Heading IDs are generated in the browser** (`updateContentAnchors`). The rule is
  `textContent.replace(/[. ,:-]+/g,'-').replace(/-$/,'')`, which gives `#Value-Source-Options`.
  The server HTML has no IDs, so these anchors only work with JS.
- Raw HTML (`<iframe>`, `<video>`, `<img>`, `<div>`) appears about 32 times in KB markdown.
- Data files: `customers.yml`, `footer_links.yml`, `kb_sections.yml` and `contributors.json`.
  The last is regenerated by `bin/fetch-contributors.js` from the GitHub API.

### 1.4 Static assets: 122 MB, 434 files
- About **32 MB is referenced** from `src/`. About **90 MB / 178 files appears unreferenced**,
  going by a basename match. The biggest item is the `static/assets/images/docs/gitbook/`
  directory (53 MB), which largely duplicates `docs/gifs/`. There are 14 exact-duplicate
  files, and GIFs up to **21 MB**.
- **Externally referenced asset:** `https://redash.io/assets/images/logo.png` is used by
  the app's email template (`redash/templates/emails/layout.html:549`), so already-sent emails
  depend on it. All `/assets/...` paths must be preserved, or at least the referenced ones.
- **Decision: drop the unused assets.** Carry over only the files referenced from content or
  templates, plus `logo.png` and any other path the Phase 0 crawl or GA shows getting hits.

### 1.5 Redirects
- **`website/_redirects`**: 94 lines, about 85 rules, all `301!` (forced). They cover the
  legacy `.html` paths (`/help-onpremise/*`, `/help/*/…html`, `/datasources/*.html`) and a
  2019–2020 KB restructure (`/help/data-sources/*-setup` → `/setup/*` → `/querying/*`). They
  also send old examples off-site to `discuss.redash.io` and the GitHub wiki, and include
  `/slack*`, `/features`, `/get-started`, `/pricing → /`, `/v4`, `/testing` and a
  `/help-onpremise/*` splat.
- **Redirect chains exist.** For example, the in-app link `/help/data-sources/amazon-athena-setup`
  goes to `/help/data-sources/setup/amazon-athena`, then to `/help/data-sources/querying/amazon-athena`,
  then gets a trailing slash. There are also legacy `docs.redash.io` → `*.html` → new path chains.
- **Trailing slashes:** Netlify 301s `/help/x` → `/help/x/`, and the sitemap uses the
  slash form.
- **`docs.redash.io`** is a CNAME to `redash-docs-redirector.netlify.com` (the legacy `.com`
  domain). It has 109 rules for old ReadTheDocs `/en/latest/*` paths and HelpScout `/article/*`
  paths. **HTTPS on docs.redash.io is broken today** (cert mismatch). HTTP works for
  `/en/latest/*`, but `/article/*` returns 404 on that host. Some targets already 404,
  e.g. `/help/faq/hosted-redash/`.
- **`help.redash.io`** is a **separate Netlify project** (per Arik). It sits behind a
  Cloudflare-proxied DNS record, which is why responses show `server: cloudflare`. It 301s
  old HelpScout `/article/*` URLs to the matching KB pages. Arik thinks it is **probably not
  needed** any more. Its handling is **optional** in this plan (§5.2).
- `www.redash.io` 301s to the apex through Cloudflare.

### 1.6 Integrations
| Integration | Where | Migration action |
|---|---|---|
| **Algolia** (app `QFZW4KBIT0`, index `kb`, public search key in `src/data/algolia.js`). Indexed only on production builds via `ALGOLIA_API_KEY` in Netlify env | Help page search box | Replace with Pagefind, built in to Starlight. Optionally apply to DocSearch later. |
| **Segment** analytics (`static/assets/scripts/a.js`, plus `analytics.page()` on route change) | All pages | **Drop.** The repo has no direct GA tag: `gatsby-plugin-google-analytics` is installed but never enabled in `gatsby-config.js`. So GA data most likely arrives **via a Segment → GA destination**, and dropping Segment would stop it. **GA wiring is TBD (follow-up):** confirm the property and whether it's Segment-fed, then most likely add a direct GA4 tag (inline `gtag.js` in the shared `<head>`, production only). Until that's resolved, the GA tag is a placeholder component that's off by default. Optionally add Cloudflare Web Analytics (free, cookieless), so there's *some* traffic view from day one regardless. **Search Console** stays. Arik believes it's verified via DNS, which survives a hosting move untouched. Confirming that is tracked separately. |
| **Netlify Forms** (`/contact`, honeypot) | Contact page | Replace with a static page (see "Contact form" below). |
| `_headers`: `Content-Security-Policy: frame-ancestors *` | All pages | Must keep, since the in-app drawer frames the site. |
| GitHub buttons script, Twitter embeds | community / some pages | Keep or drop in the redesign. |
| iframe postMessage contract with the app (`Layout.jsx` `reportUrlChange`, `withIframeHook`) | KB pages | **Must port** (see §5.3). |

**Contact form: what it does today, and the proposed replacement**
- `src/pages/contact/index.jsx` is a **Netlify Forms** form named `contact`, with fields
  `name`, `email` and `message` and a `bot-field` honeypot. JS POSTs it URL-encoded to `/`
  and then navigates to `/contact/thank-you/`. Netlify detects the form at deploy time
  (`data-netlify="true"`) and stores submissions in the **Netlify dashboard (Site → Forms)**.
  Any email or Slack notification is set up **only in the Netlify UI**, so the repo cannot
  say where submissions go. Check the Forms tab and its notification settings before
  cutover, and export the existing submissions.
- The page says it is "only for general inquiries" and sends OSS users to GitHub Discussions.
  **No page on the site links to `/contact/`**: it isn't in the header, footer or data files.
  It is reachable only through the sitemap and search engines.
- **Decided replacement (no backend, $0):** `/contact/` becomes a static page that points
  to **GitHub Discussions** for everything, with no email address and no form.
  `/contact/thank-you/` 301s to `/contact/`. Nothing to run, no spam handling, nothing to
  monitor.
- If a real form turns out to be needed later, the free-tier upgrade path is a small Worker
  with Turnstile that sends mail through Cloudflare Email Routing (`send_email` binding). It is
  deliberately **not** in scope.

### 1.7 Traffic-sensitive URLs (must not break)
Real analytics are not available to me (see open questions). These are critical from code
references alone:
- **Hardcoded in shipped Redash builds** (`HelpTrigger.jsx`, `viz-lib/.../ContextHelp.tsx`,
  `MobileNavbar.jsx`, `redash/settings/__init__.py`, README/CONTRIBUTING/CHANGELOG):
  `/help`, `/help/user-guide/{getting-started,dashboards,querying,alerts}`,
  `/help/user-guide/querying/query-parameters#Value-Source-Options`
  and `#Parameter-Mapping-on-Dashboards`, `/help/user-guide/dashboards/sharing-dashboards`,
  `/help/user-guide/users/authentication-options`, `/help/open-source/admin-guide/usage-data`,
  `/help/open-source/admin-guide/secrets` (shown in a startup error),
  `/help/open-source/setup/#Mail-Configuration`, `/help/user-guide/alerts/setting-up-an-alert`,
  `/help/user-guide/alerts/custom-alert-notifications`,
  `/help/user-guide/querying/favorites-tagging/#Favorites`,
  `/help/user-guide/querying/writing-queries#Managing-Query-Permissions`,
  `/help/user-guide/visualizations/{formatting-numbers,formatting-axis,visualization-types}`,
  `/help/user-guide/querying/query-results-data-source`, `/help/data-sources/supported-data-sources`,
  and the legacy-shaped `/help/data-sources/{amazon-athena-setup,bigquery-setup,querying-urls,mongodb-setup,querying-a-google-spreadsheet,google-analytics-setup,axibase-time-series-database}`,
  which only work via redirects.
- `/help/open-source/setup` and `/help/open-source/admin-guide/{how-to-upgrade,env-vars-settings}`
  are the most-linked self-hosting docs on the web.
- `/data-sources/*` landing pages, which carry SEO.
- `/assets/images/logo.png` (emails), `/community/code_of_conduct` (CONTRIBUTING), and
  `/?ref=public-dashboard` (public dashboards' "Powered by").

---

## 2. Decision 1: monorepo vs separate repo

### 2.1 Options considered
- **A. Monorepo:** the whole site (marketing + docs) lives in `getredash/redash` under `/website`.
- **B. Separate repo (status quo, modernised):** `getredash/website` gets the new stack and
  stays its own repo.
- **C. Hybrid:** docs content lives in the monorepo (`/docs` or `/website/docs`). Marketing
  stays in `getredash/website`, which pulls docs in at build time (submodule, sparse
  checkout or a CI artifact).

### 2.2 Trade-offs

| Dimension | A. Monorepo | B. Separate repo | C. Hybrid |
|---|---|---|---|
| **Docs/code drift** (env-var table ~90 documented vs ~155 `REDASH_*` read in code; hand-edited upgrade table; hand-listed data sources) | ✔ A feature PR can include its docs, and reviewers see both. Later, generate the env-var table and data-source list straight from `redash/settings` and `redash/query_runner` during the build. | ✘ Docs are a separate PR in a separate repo that is easy to forget (~6 commits/yr). Generating docs from code requires cross-repo checkout. | ✔ for docs, ✘ for marketing (e.g. the data-source landing pages still drift) |
| **Versioned docs** (the agreed stable + next + archives) | ✔ Cheap and exact: a docs version *is* a git ref of the code (§4) | ✘ Version tags must be mirrored or kept in sync by hand. Needs either copied doc trees per version or cross-repo tag mapping. | ✔ for docs, but the build has to combine refs from two repos |
| **CI cost / noise** | ⚠ Needs a `changes` gate so doc-only PRs skip backend, e2e and visual tests while the required checks still pass (§6.2). This is a one-time setup. | ✔ Fully isolated | ⚠ Both repos need CI, plus a cross-repo trigger whenever docs change |
| **Repo size / clone time** | ⚠ Bounded: no history import, unused assets dropped, GIFs converted. Target < 25 MB added. | ✔ No impact on Redash clones | ⚠ Like A for docs assets |
| **Dependencies & security alerts** | ⚠ More `package.json`s to keep current (Renovate or Dependabot for `website/`), and site advisories show up in the main repo's security tab. Mitigated by a separate lockfile, a small dependency tree, and the site being static with no runtime. | ✔ Isolated | ⚠ Split across both repos |
| **Contributor experience** | ✔ One place, one CONTRIBUTING, and typo fixes sit next to the code they describe. ⚠ First-time contributors clone a big repo just to fix a typo (but the GitHub web editor plus "Edit this page" links avoid cloning entirely). | ✔ Tiny repo, easy first PR. ✘ Contributors have to know the site repo exists. | ✘ Most confusing: "which repo do I edit?" |
| **Review / permissions** | ⚠ Website-only PRs need an approval from someone with monorepo write access (no CODEOWNERS split for now, per Arik). Fine at the current volume. | ✔ Separate permissions are possible | ⚠ |
| **Release coupling** | ✔ Stable docs move with releases automatically. Marketing still deploys from `master` on every merge, so it isn't blocked by releases. | ✘ Manual "list release X" chores (the main activity in the website repo today) | ✔ docs / ✘ marketing |
| **Hosting/deploy** | Same (static deploy from Actions), with deploy secrets in the main repo, scoped to a token that can only deploy this one project | Same | Most complex: two pipelines |
| **Reversibility** | ✔ `website/` is self-contained (own lockfile, own workflow), so `git filter-repo` can split it back out if this doesn't work | — | — |

### 2.3 Final recommendation: **A, the monorepo, in `/website`**
Goal #1, docs versioned alongside releases, is only cheap and exact when docs share git refs
with the code. Drift is the main quality problem today, and co-location (plus generating docs
from code later) is the only real fix. Option A's costs are one-time and bounded: the CI
gate, the asset diet and a separate lockfile. Option C gets the docs benefits but keeps
every cost of two repos and adds build coupling.

Conditions that make A work (all included in the plan):
- `website/` is **self-contained**: its own `package.json` + `pnpm-lock.yaml`, not in
  `pnpm-workspace.yaml`, and listed in `.dockerignore`, so Docker images and the app's
  `pnpm install` are unaffected.
- **Path-gated CI** that keeps the required checks green for website-only PRs (§6.2).
- **No history import.** Copy a cleaned tree and point to the archived `getredash/website` for
  history. Unused assets are dropped (decided).
- Remove the **dead root `netlify.toml`** (the old app PR previews, which Arik confirmed are
  dead) and its `.dockerignore` line, so there is no confusion over which Netlify config is live.
- An "Edit this page" link on every docs page pointing to `docs/...` on GitHub, for
  zero-clone typo fixes.

### 2.4 Layout: `/docs` for content, `/website` for the site
**Docs content lives in a top-level `/docs` folder, separate from the site code in
`/website`** (per Arik, for discoverability).

| | `/docs` (content) | `/website` (site) |
|---|---|---|
| What | The help/KB Markdown (`user-guide/`, `data-sources/`, `open-source/`, `faq/`) and the images those pages use | Astro + Starlight project: config, theme/components, marketing pages, landing-page collections, `public/` (redirects, headers, legacy `/assets`), build scripts |
| Who edits | Feature authors, doc contributors, maintainers | Rarely: site and redesign work |
| URL mapping | `docs/<path>.md` → `https://redash.io/help/<path>/` (1:1, no `help/` folder needed) | — |

Why it's better than `website/src/content/docs/help/…`:
- **Discoverability:** `/docs` is the conventional place on GitHub, and it sits next to
  `redash/` and `client/`. Contributors find it without knowing Astro exists.
- **Clear diffs:** a feature PR touching `redash/query_runner/foo.py` + `docs/data-sources/foo.md`
  reads naturally, with no site internals in the diff.
- **Clean CI scoping:** `docs/**` = content and `website/**` = site, so path filters and
  review are simpler (§6.2).
- **Decoupled renderer:** the redesign (or even a future stack change) rewrites `/website`
  without touching a single content file.
- **Versioning is unchanged and simpler to reason about:** a docs version is `docs/` at
  a git ref (§4). Optionally, archives can be rendered with the *current* `/website` shell, so
  old versions get theme and search fixes.

Contract between the two folders (keeps `/docs` plain and portable):
- Files are **Markdown first** (`.md`). MDX is allowed only where components are needed,
  and only components from a small, documented set (`Since`, `Tabs`, asides via `:::note`).
- Frontmatter is validated by the site's schema (Starlight `docsSchema` plus our extras:
  `keywords`, legacy `helpscout_url`), so bad frontmatter fails the docs PR's build.
- Images are co-located (`docs/user-guide/alerts/img/…`) and referenced relatively. Astro
  optimises them. Legacy absolute `/assets/images/docs/...` URLs stay in
  `website/public/assets/` only where something external hotlinks them.
- `docs/README.md` explains "how to write docs and preview them": `pnpm -C website dev`, and
  the "Edit this page" flow.

How the site reads it (to confirm in the Phase 1 spike):
- **Preferred:** in `website/src/content.config.ts`, define Starlight's `docs` collection
  with Astro's `glob()` loader at `base: '../docs'` and a `generateId` that prefixes
  `DOCS_BASE` (`help/`, `help/next/`, `help/v/26.9/`) and strips `/index`, with
  `schema: docsSchema()`. Astro's glob loader can read from anywhere on the filesystem,
  and Vite's `server.fs.allow` needs `..` for dev. **What the spike must confirm:** Starlight
  accepts a non-default loader and base for `docs` (routing, sidebar autogeneration,
  `editLink`, Pagefind indexing, relative image imports). Neither the Starlight nor the Astro
  docs state this explicitly.
- **Guaranteed fallback:** a `prebuild`/`predev` step syncs `../docs` into
  `website/src/content/docs/help/` (gitignored), with a file watcher in dev. It's slightly
  clunkier, but it works with stock Starlight. A symlink is *not* recommended, because of
  Windows contributors and Git symlink settings.

---

## 3. Decision 2: stack

### 3.1 Comparison (for this site: ~15 bespoke marketing pages, ~40 templated landing pages, ~80 docs pages, versioned docs, maybe a blog later, redesign later)

| | **Astro + Starlight** | Docusaurus | VitePress | Next.js + Nextra | MkDocs Material |
|---|---|---|---|---|---|
| Marketing pages | ★★★ Any HTML/CSS, islands for interactivity, zero JS by default. Best canvas for a redesign. | ★★ React pages, but Infima/theme gets in the way of a bespoke look | ★★ Vue pages, possible but docs-centric | ★★★ Full React/Next, but heavyweight for a static site | ★ Templating via Jinja overrides only; poor fit for marketing |
| Docs UX out of the box | ★★★ Sidebar, ToC, asides, tabs, a11y, dark mode | ★★★ | ★★★ | ★★ | ★★★ |
| **Versioning** | ★★ Community plugin (`starlight-versions`, by a Starlight maintainer) **or** the git-ref approach in §4 (framework-agnostic) | ★★★ First-class, but copies the whole docs tree per version into the repo | ★ DIY | ★ DIY | ★★ `mike` (git-branch-based, Python toolchain) |
| Search | Pagefind built in (static, free). DocSearch supported | Algolia DocSearch first-class. Local-search plugins | Built-in local (MiniSearch) or Algolia | Built-in (FlexSearch) | Built-in lunr |
| i18n | ★★★ Built in (UI strings plus content fallbacks) | ★★★ | ★★ | ★★ | ★★ |
| MDX | ✔ (MDX + Markdoc + Markdown) | ✔ (MDX v3, strict: raw HTML in `.md` can break) | Vue-in-MD, not MDX | ✔ | ✘ (Markdown + extensions) |
| Blog | Astro content collection (trivial) or `starlight-blog` plugin | ★★★ Built in | DIY | DIY | Plugin |
| Migration from current | Markdown copies over nearly 1:1. JSX pages port to `.astro` (mostly mechanical: JSX→HTML, `className`→`class`). React components can be reused as-is if wanted. | MD→MDX strictness fixes. Marketing pages port easily (React). | Rewrite marketing pages in Vue | JSX ports easily. More framework to maintain | Rewrite all marketing pages |
| Toolchain fit with monorepo | Node + pnpm (same as `client/`) | Node | Node | Node | **Python + separate deps**. Odd for a site that needs bespoke marketing pages |
| Maintenance burden | Low. Static output, small dependency tree, fast builds (seconds) | Medium (React/webpack-or-Rspack stack, major upgrades) | Low | **High** (Next upgrade churn, App Router vs Pages) | Low, but Material for MkDocs is in maintenance mode / moving to Zensical, so there is roadmap risk |

### 3.2 Recommendation: **Astro + Starlight**
- It is the one option that is excellent at **both** halves: bespoke marketing pages (and the
  later redesign) as plain Astro, and a high-quality docs shell for `/help` from Starlight.
  Docusaurus is the runner-up, and it would be the pick if built-in versioning were the
  overriding priority. But its versioning is the copy-the-tree model I advise against below,
  and its theme fights a custom marketing design.
- Static by default with almost no client JS, which helps SEO and Core Web Vitals.
  Pagefind gives free search with nothing extra to run or pay for.
- Built-in i18n means no lock-in if translations ever matter. They don't today.
- Content collections with Zod schemas validate frontmatter (`category`, `order`, `logo`…),
  so broken pages fail the build instead of failing silently.

Trade-offs to accept:
- Versioning is not first-class. §4 covers it without depending on a plugin.
- Starlight URL generation is file-path-based. We map the current
  `/help/{parent_category}/{category}/{slug}` scheme into the file layout. Starlight docs are
  mounted at `/help/` via the loader's ID prefix (or the sync fallback), with content in
  `/docs` (§2.4), so URLs come out identical. It is not a big deal, but it is a one-time
  content move.
- Heading-anchor compatibility needs a small rehype plugin (§5.3).

Search: start with **Pagefind**. It is per-version (each version build gets its own index),
free and offline-capable. Apply to **Algolia DocSearch** (free for OSS docs) later only if
search quality complaints show up. Retire the existing Algolia app and index after cutover.

---

## 4. Versioning strategy

Facts: Redash ships about 2 stable releases a year with CalVer (25.1, 25.8, 26.3, 26.9), plus
monthly `-dev` snapshots. Recent releases are tags on `master`. The old `release/X.0.x`
branches are no longer used. Most KB content (user guide) is effectively version-agnostic.
The self-hosting pages (setup, env vars, upgrade, auth) are what genuinely differ per version.

**Model: versions are built from git refs, not copied in the repo.**

| Published path | Built from | Indexed? |
|---|---|---|
| `/help/…` (**stable**, the default) | the latest release tag, e.g. `v26.9.0`. Docs-only fixes go through a `docs/stable` branch (see below) | yes |
| `/help/next/…` | `master` | `noindex`, canonical → stable equivalent |
| `/help/v/26.9/…` (**frozen at cutover**) | the tag `docs/v26.9` on the cutover commit, i.e. the migrated content, which is today's docs for 26.9 | `noindex`, canonical → stable |
| `/help/v/<later>/…` | older release tags, once newer releases exist | `noindex`, canonical → stable |
| marketing pages (`/`, `/product`, `/data-sources/*`, …) | always `master` | yes |

How it works:
- The Astro config takes `DOCS_BASE` (e.g. `/help`, `/help/next`, `/help/v/26.3`) and
  `SITE_PART` (`all` | `docs-only`). The deploy workflow builds `master` → marketing + `/help/next`.
  It builds `docs/stable` → `/help` (docs-only), and builds each archive ref → `/help/v/<ver>`
  (docs-only). Then it merges the `dist/` trees and deploys **one** static bundle. Each part
  has its own Pagefind index.
- **Archives cost nothing to store.** They are rebuilt from their git refs on every deploy.
  A docs-only build of ~100 pages takes seconds, so 2–3 archives add well under a minute to
  CI. Built `dist/` trees are cached in the Actions cache by ref SHA, so in practice they
  are restored, not rebuilt. There is no R2 and no external artifact store. By default an
  archive builds with both `docs/` *and* `website/` from its own ref (reproducible, own
  lockfile). Because content and renderer are separate folders (§2.4), we can later switch
  to rendering old `docs/` with the current `website/`, if theme or search fixes should
  reach the archives too.
- **`docs/stable` branch:** at release, CI fast-forwards it to the release tag. Docs fixes
  that apply to stable are made on `master` with the `docs-backport` label, and a bot
  cherry-picks them onto `docs/stable`. This keeps "fix a typo" a single PR for contributors,
  and stable docs never show unreleased features.
- Version switcher: a small Starlight component override (dropdown) driven by a
  `versions.json` that the deploy workflow generates. Pages missing in the target version
  fall back to that version's `/help/` root.
- Archive policy: keep the last **2–3** releases as archives, and drop older ones from the
  switcher (their URLs 301 to stable). This matches what self-hosters actually run.
- Inside a version, use a `<Since version="26.10" />` badge component for new features. It is
  cheap and helps readers on the next version.

Why not Docusaurus- or `starlight-versions`-style copies: they duplicate about 100 pages per
release in the repo. Fixes then have to be applied N times, and the copies are disconnected
from the code that was actually released. Git refs give "docs exactly as of that release"
for free.

**Phasing (confirmed with Arik):**
- **Phase 1, at cutover:** `/help/` is a single docs tree from `master`, the same as today.
  It is joined by **`/help/v/26.9/`**, a frozen archive of the migrated content. Tag the
  cutover commit `docs/v26.9`, and the deploy builds that ref docs-only. This gives us the
  version switcher (two entries: "Latest" and "26.9") and the archive pipeline from day one,
  while the stable-from-tag logic is not live yet.
- **Phase 2, at the first Redash release after cutover (e.g. 27.x; migration Phase 4 in §8):** turn on
  stable-from-tag `/help/`, `/help/next/` from `master`, and the `docs/stable` backport flow.
  Each later release adds an archive, keeping the last 2–3. Releases ≤ 26.3 get no archive,
  because their docs were never captured separately.

---

## 5. URL / redirect preservation & SEO plan

### 5.1 URL parity
- Keep **every** URL in the current sitemap byte-identical, *including trailing slashes*.
  Use Astro `trailingSlash: 'always'` and `build.format: 'directory'`, plus Cloudflare's
  default auto-trailing-slash HTML handling, so `/help/x` → 301 → `/help/x/` as Netlify does
  today.
- Keep `/sitemap-index.xml` and `/sitemap-0.xml` names (`@astrojs/sitemap` emits
  `sitemap-index.xml` + `sitemap-0.xml` by default). Keep `robots.txt`.
- Keep `/assets/**` paths for every asset still in use, and specifically `/assets/images/logo.png`.
- Keep the 404 page (Starlight provides one, and Cloudflare serves `404.html` with a 404 status).

### 5.2 Redirects
- Port `_redirects` into `website/public/_redirects`. The Netlify syntax `301!` → `301` works,
  since Cloudflare always applies `_redirects` before assets. That is about 85 rules, well
  under the 2,000 static / 100 dynamic limit.
- **Flatten chains**, so every legacy URL goes to its final target in one hop. A small script
  resolves the graph and fails CI on cycles or on targets that don't exist in the build.
- **Fold in `docs-redirector`** (109 rules). Host-scoped rules can't live in `_redirects`, so
  move them to **one Cloudflare Bulk Redirect list** on `docs.redash.io`. It fits in the free
  plan's 15 rules, 5 lists and 10,000 URL redirects per account, with a catch-all
  Single Redirect `docs.redash.io/* → https://redash.io/help/` (free: 10 per zone). Check the
  list's CSV into `website/infra/docs-redash-io-redirects.csv` so it's versioned. Point `docs.redash.io` at Cloudflare (proxied DNS record, no origin needed).
  This also **fixes the broken HTTPS** on docs.redash.io. Fix the targets that currently 404
  (e.g. `/help/faq/hosted-redash/` → `/help/faq/general/`). Then archive `getredash/docs-redirector`.
- **`help.redash.io`: retire it if traffic is negligible (approved).** It is a separate
  Netlify project. Leave it running through cutover. In Phase 3, check Cloudflare zone
  analytics for `help.redash.io` (the record is proxied, so traffic shows up there).
  - If traffic is negligible: delete the Netlify project and either drop the DNS record
    or 301 the whole host to `https://redash.io/help/` with one free Single Redirect rule.
  - If its `/article/*` mappings still get traffic: add them as a second Bulk Redirect
    list. The free plan allows 5 lists and 10,000 URL redirects per account.
- Add a **redirect test** to the website CI: every URL in (old sitemap ∪ old `_redirects`
  sources ∪ docs-redirector sources ∪ hardcoded app URLs from §1.7) must resolve to a 200
  within ≤ 1 hop against the preview deployment.

### 5.3 App-embedding compatibility (critical)
- **Heading anchors:** add a rehype plugin so each heading gets *both* the Starlight-style
  slug ID (`value-source-options`) *and* a legacy alias anchor
  (`<span id="Value-Source-Options">`), using the old regex. This makes the in-app deep links
  work and makes them work **without JS**, which they don't today. Fix the app's `HelpTrigger`
  URLs to the new canonical form later, but old installs keep the old ones forever.
- **postMessage:** port `reportUrlChange` (on load, on `hashchange`, and a reset on unload),
  plus the `drawer` body class with the header/footer-hiding CSS, as a tiny inline script in
  the Starlight `Head` override. Smoke test: point a local Redash at the preview URL (allow
  it in `HelpTrigger` `allowedDomains` and the CSP for the test only) and open the help drawer.
- **Headers:** `public/_headers` with `/*  Content-Security-Policy: frame-ancestors *`. Do not
  add `X-Frame-Options`.

### 5.4 SEO
- Same titles, meta descriptions, `keywords` (low value but harmless), OG and Twitter tags,
  canonical URLs (absolute, trailing slash). Archive and `next` versions are `noindex` +
  canonical to stable.
- Before cutover: crawl the old site (e.g. `linkinator` or `lychee`) and save the URL list,
  status codes and `<title>`s. After cutover, diff them.
- Google Search Console: verify the property (DNS TXT via Cloudflare if it isn't verified
  already), resubmit the sitemap on cutover day, and watch Coverage and 404s for 4 weeks.

---

## 6. Proposed monorepo layout & CI

### 6.1 Layout
```
docs/                     # ← help/KB content; docs/<path>.md → redash.io/help/<path>/
  README.md               # how to write & preview docs
  user-guide/             #   alerts/, dashboards/, querying/, users/, visualizations/, integrations-and-api/, getting-started.md
  data-sources/
  open-source/            #   setup.md, admin-guide/, dev-guide/
  faq/
  (images co-located per section, e.g. user-guide/alerts/img/)

website/
  package.json            # own deps; NOT in pnpm-workspace.yaml
  pnpm-lock.yaml
  astro.config.mjs        # Starlight; DOCS_BASE / SITE_PART env; editLink → docs/
  src/content.config.ts   # docs collection = glob('../docs') + docsSchema()
  wrangler.jsonc          # Workers static-assets config (or Pages project name)
  public/
    _redirects            # flattened legacy redirects
    _headers              # frame-ancestors *
    robots.txt
    assets/…              # preserved legacy asset paths (trimmed)
  src/
    content/
      docs/help/          # ONLY if the sync fallback is needed (gitignored copy of ../docs)
      data-sources/       # collection → /data-sources/<x>/ landing pages
      integrations/
      case-studies/
      pages-md/           # privacy, terms, code_of_conduct
    data/                 # customers.yml, footer_links.yml, contributors.json
    pages/                # index.astro, product.astro, customers.astro, community.astro, …
    components/           # Header, Footer, Since, VersionSelect, IframeBridge …
    plugins/              # rehype-legacy-anchors.mjs
  scripts/
    migrate-content.mjs   # one-time Liquid→Markdown/aside converter (deleted after migration)
    check-redirects.mjs   # chain flattening + redirect/URL-parity test
    gen-env-vars.py       # (later) generate env-var table from redash/settings
```

### 6.2 CI (path filters without breaking required checks)
Branch protection on `master` **requires** `backend-lint`, `backend-unit-tests`,
`frontend-lint`, `frontend-unit-tests`, `frontend-e2e-tests` (and `WIP`). A workflow-level
`paths-ignore: [docs/**, website/**]` would leave docs/website-only PRs **stuck waiting** on those checks.
Instead:
- In `ci.yml`, add a first `changes` job (e.g. `dorny/paths-filter`, or a few lines of
  `git diff --name-only`) that outputs `app=true` unless *all* changed files are under
  `docs/**` or `website/**` (or other doc-only paths). Each existing job gets
  `needs: changes` + `if: needs.changes.outputs.app == 'true'`. Skipped jobs count as passing
  for required checks, so website-only PRs merge with just the website workflow.
- New `.github/workflows/website.yml`, triggered `on: pull_request/push` with
  `paths: [docs/**, website/**, .github/workflows/website.yml]`. Steps: build, astro check,
  `starlight-links-validator`, redirect/URL-parity test, then deploy a preview or production
  with `wrangler`. Release tags also trigger it (Phase 2, to rebuild stable).
- **Fork PRs** (most community doc PRs) have no secrets on `pull_request`. Use the standard
  two-stage pattern: `pull_request` builds and uploads `dist` as an artifact (no secrets),
  then a `workflow_run`-triggered job deploys the preview and comments the URL. It never
  executes PR code with secrets.
- Restyled is scoped to `redash/`, `client/` and `viz-lib/`, so it won't touch `website/`.
  Put Prettier for `website/` in the website workflow instead.
- `.dockerignore`: add `/website/`. Remove the `/netlify.toml` line together with the
  file itself.
- **Delete the root `netlify.toml`** (the old app PR previews, confirmed dead) in the same
  PR, and disconnect the corresponding Netlify site, so the monorepo has no live Netlify
  integration left.
- **Blog (undecided):** don't build it. The structure keeps the option open. A future
  `src/content/blog/` collection plus `src/pages/blog/[...slug].astro` (or the
  `starlight-blog` plugin) and `@astrojs/rss` would take about a day, with no URL conflicts
  (`/blog/` is unused today).

---

## 7. Decision 3: hosting

| | **Cloudflare (Workers Static Assets or Pages)** | GitHub Pages |
|---|---|---|
| PR previews | ✔ Preview URLs per upload/branch (unlimited). Deployed from Actions via `wrangler`, which works for fork PRs with the `workflow_run` pattern | ✘ Not supported (needs a separate preview host) |
| Server-side 301 redirects | ✔ `_redirects` (2,000 static + 100 dynamic), plus zone-level Bulk/Single Redirects for other hosts | ✘ None. Only meta-refresh/JS stubs, which are **bad for SEO** and for the legacy-URL chains. (Workaround: Cloudflare Redirect Rules in front, which means using Cloudflare anyway.) |
| Custom headers (`frame-ancestors *`) | ✔ `_headers` | ✘ |
| Build limits | Irrelevant if we build in GitHub Actions. Native Pages builds: 500/mo, 20-min timeout. Asset limits: 20k files, **25 MiB per file**, so the 21 MB GIF fits but gets converted anyway | 1 GB site, ~100 GB/mo soft bandwidth, 10 builds/hr |
| Custom domain / DNS | Same account as the existing redash.io DNS zone. Apex works natively, SSL automatic | Needs A/AAAA → GitHub IPs. Apex fine, but DNS and hosting are split |
| Analytics | GA4 tag (site-side, host-agnostic), plus optional free Cloudflare Web Analytics and zone analytics | GA4 tag only |
| Rollback | Instant: redeploy or promote a previous version (`wrangler rollback`) | Re-run an old commit's deploy |
| Cost | **$0 on the Free plan**: static asset requests are free and unmetered, and `_redirects`/`_headers` are processed in the asset layer (no Worker invocations). Docs redirects use free Bulk/Single Redirects. No credits needed. Alexandria, if granted later, is just headroom. | Free |
| Lock-in | Low. Plain static `dist/` + `_redirects` + `_headers` (the same format Netlify uses) | Low |

**Recommendation: Cloudflare, free tier.** Deploy with **Workers Static Assets**
(`wrangler deploy`), as an **assets-only Worker with no `main` script**. Cloudflare now
steers new projects there, and it supports `_redirects`, `_headers` and preview URLs. With
no script, nothing counts against the Workers free-plan request/CPU limits. Free-tier
guardrails:
- No R2, no Worker script, no paid add-ons. Builds run in GitHub Actions (free for this
  public repo), so Cloudflare build quotas don't apply.
- Asset limits: 20,000 files and 25 MiB per file. We're at about 300 files after cleanup,
  and GIF conversion keeps every file well under the limit.
- Redirects: about 85 in `_redirects` (limit 2,100). docs.redash.io uses 1 Bulk list plus
  1 Single rule, both within Free plan quotas. If preview ergonomics or the custom-domain setup
turn out simpler on **Pages direct-upload**, that is an equivalent fallback with the same
artifacts. **Verify Workers preview-URL behaviour with custom domains during the spike.**
Build in GitHub Actions in both cases, so CI, path filtering and logs stay with the code.

Optional: also mirror `dist` to GitHub Pages? No. It adds a second source of truth for no gain.

---

## 8. Step-by-step migration plan

**Phase 0: prep (no user-visible change), ~1 day**
1. Create the Cloudflare Worker/Pages project on the **Free plan**, and an API token scoped
   to it (Workers/Pages edit for this account only). Add repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
2. Crawl the live site: save URL list, status, title, canonical and redirect hops for
   sitemap URLs, `_redirects` sources, docs-redirector sources and the app URLs from §1.7.
   This becomes `website/scripts/fixtures/legacy-urls.json`.
3. Pull 12 months of **GA** and **Search Console** data to rank pages, find top landing
   pages and inbound legacy URLs, and confirm nothing big is missing from the sitemap. (GA
   wiring after Segment is a TBD follow-up. Search Console's DNS verification is tracked
   separately.)
4. In the Netlify dashboard, export past **Forms → contact** submissions for the record.
   The replacement page is Discussions-only, so no inbox is needed.
5. Freeze big content changes on `getredash/website` (announce it). Keep it accepting
   emergency fixes until cutover.

**Phase 1: build the new site in a PR to `master` (not deployed to the apex), ~7–10 days**
6. Scaffold `website/` (Astro + Starlight, own lockfile), `.dockerignore`, the CI `changes`
   gate and `website.yml`, with preview deploys only. **Day-1 spike:** the Starlight `docs`
   collection loading from `../docs` (§2.4). Pick the loader or the sync fallback before
   migrating content.
7. Content migration script: move KB markdown into `docs/<parent>/<category>/<slug>.md`
   (category index pages → `index.md`), co-locate each page's images, add `docs/README.md`. Map frontmatter (`order` → `sidebar.order`; keep
   `description` and `keywords`). Convert `{% callout %}` → asides, `{% link %}` → relative
   links and `{% raw %}` → code fences. Translate the raw-HTML video/iframe embeds.
8. Sidebar from `kb_sections.yml` order. Rehype legacy-anchor plugin. Iframe bridge plus
   drawer CSS. `_headers`.
9. Port marketing pages to `.astro`, reusing the current Bootstrap-ish look *minimally*. The
   goal is visual parity-ish, not a redesign. The redesign comes later and will replace this
   CSS anyway. Port the data-source and integration templated pages as content collections.
   **All marketing content is ported as-is**, including customers, case studies, partner data
   sources, `/integrations/*` and the FAQ pages. Nothing is pruned until the redesign.
10. Assets: **drop the unused files** (decided). Copy only those referenced from content or
   templates, plus `/assets/images/logo.png` and any `/assets/**` path the crawl or GA shows
   getting hits. Convert heavy GIFs to MP4/WebM.
11. Redirects: port, flatten and add the URL-parity/redirect test. Contact page → a static
    page linking to Discussions, with `/contact/thank-you/` → 301 `/contact/`.
    **Remove Segment.** Add the GA placeholder component (off until the GA follow-up is
    resolved). Delete the root `netlify.toml` (dead app previews).
11b. Versioning groundwork: `DOCS_BASE`/`SITE_PART` build modes, the merge-`dist` deploy
    step, the version switcher (`versions.json`), `noindex`/canonical for archives, and an
    archive build of the migrated content at `/help/v/26.9/`. The preview builds the archive
    from the PR head. The `docs/v26.9` tag is created at merge (step 13).
12. Review on the preview URL: link check, redirect test green, Lighthouse, visual spot-check
    of the top 20 pages, and an in-app help drawer test against the preview.

**Phase 2: cutover, ~0.5 day, low-traffic window**
13. Merge, and tag the merge commit `docs/v26.9`. Production deploy goes to the Workers/Pages project, verified on its `*.workers.dev`
    or `*.pages.dev` hostname, plus a temporary `next.redash.io` custom domain.
14. Lower the TTL on the apex/www records the day before. Then switch the `redash.io` DNS
    records from Netlify's IPs to the Cloudflare custom domain/route (proxied). Leave the
    Netlify site **running and untouched** for rollback.
15. Immediately run the redirect/URL-parity test against production `https://redash.io`, and
    check the help drawer from a real Redash instance.
16. Set up the `docs.redash.io` Bulk Redirects and repoint its DNS record from
    `redash-docs-redirector.netlify.com` to Cloudflare. Re-test the docs-redirector sources.
17. Search Console: resubmit the sitemap. GA: if the follow-up is resolved by then,
    confirm the real-time view shows hits from the new site. If not, accept a GA gap and
    note its start date.

**Rollback** (any time in the first 2 weeks): point the apex DNS records back to Netlify.
Propagation is fast because the record is proxied and on Cloudflare. Netlify keeps serving
the last Gatsby build. For in-Cloudflare regressions, `wrangler rollback` restores the
previous version.

**Phase 3: decommission, ~2 weeks after cutover**
18. Archive `getredash/website` (README pointer to `redash/website/`) and
    `getredash/docs-redirector`. Delete the Netlify sites (website, docs-redirector, and the
    dead app-preview site). Retire `help.redash.io` if its traffic is negligible (§5.2). Delete the Algolia admin
    key and index. Disable the Segment source.
19. Update `HelpTrigger` URLs in the app to the canonical, redirect-free forms. Add a
    `CONTRIBUTING` section on docs. Add the release-checklist step "bump upgrade table"
    (later generated).

**Phase 4: full versioning, at the next release, ~1.5–2 days**
20. Stable-from-tag `/help/`, `/help/next/` from `master`, `docs/stable` branch automation
    and the backport-label bot. (`DOCS_BASE`/`SITE_PART` build modes, the archive pipeline,
    the switcher and `noindex`/canonical ship in Phase 1 for the 26.9 archive.)

**Later (not in scope):** the visual redesign, replacing the marketing CSS on top of the
Astro components. Generated docs: the env-var table from `redash/settings`, data-source pages
from the query-runner registry, and the upgrade table from releases. A blog (undecided,
about a day, see §6.2). DocSearch. A real contact form (Worker + Turnstile) only if a need
shows up.

---

## 9. Effort estimate (one engineer familiar with the codebase)

| Work | Days |
|---|---|
| Phase 0 prep, crawl, Cloudflare setup | 1 |
| Scaffold, CI gating, preview deploys (incl. fork-PR flow) | 1.5 |
| Content migration script + KB fixes + sidebar | 1.5–2 |
| `/docs` ↔ `/website` wiring spike (loader or sync fallback), image co-location | 0.5 |
| Marketing pages + templated landing pages (parity, not redesign) | 2.5–3.5 |
| Assets cleanup/conversion | 0.5–1 |
| Redirects, flattening, URL-parity test, anchors, iframe bridge | 1–1.5 |
| Static contact page, GA4 swap, removing `netlify.toml` | 0.25 |
| Version build modes + switcher + frozen 26.9 archive (moved into Phase 1) | 1 |
| QA, cutover, docs.redash.io | 1 |
| **Total to cutover** | **~8.5–11.5** |
| Phase 4 full versioning (stable-from-tag, next, backport bot) | 1.5–2 |

The biggest uncertainty is how much marketing-page fidelity is wanted before the redesign.
If "good enough until redesign" is acceptable, take the low end.

---

## 10. Risks
- **Broken in-app help for old installs** (anchors, iframe contract, redirects). Mitigated
  by the URL-parity test including every app-hardcoded URL, legacy anchor aliases, and a
  drawer smoke test.
- **SEO dip**. Mitigated by identical URLs, single-hop 301s, the same sitemap names and
  Search Console monitoring. Expect neutral to positive, since the pages get faster and the
  server HTML gains anchors.
- **pnpm workspace interaction** with a nested non-member package. Verify in the spike, with a
  fallback of adding `website` to the workspace and accepting a shared lockfile.
- **Workers Static Assets preview/custom-domain specifics**. Spike first, with Pages
  direct-upload as the fallback.
- **GA data gap if GA is fed via Segment.** Dropping Segment without adding a direct GA4
  tag would silently stop GA collection. GA wiring is a TBD follow-up. Ideally resolve it
  before cutover and enable the tag in the same deploy. Otherwise record the gap's start
  date. Search Console (DNS-verified) is unaffected either way.
- **CI gating mistakes** (accidentally skipping app tests). The `changes` filter should be
  *allow-list doc-only paths*, so anything outside `docs/**` and `website/**` runs everything.
- **Starlight with a non-default docs location** (§2.4). Spike it on day 1 of Phase 1, with
  the sync-step fallback ready.

---

## 11. Follow-ups (not blocking the plan)
1. **GA wiring after Segment: TBD.** Identify the GA property and whether it's fed only
   through Segment, then decide on a direct GA4 tag (and whether a consent banner is
   needed). Ideally before cutover. Otherwise accept and date the gap (§10).
2. **Search Console verification:** believed to be DNS-based (so unaffected by the move).
   Tracked separately. Confirm before cutover.
3. **Cloudflare deploy token:** Arik will create the account-scoped API token for the deploy
   workflow (Phase 0 step 1).
4. **Spike result for `/docs` loading** (§2.4) decides loader vs sync fallback.

---

## 12. Decisions log (Arik, 2026-10-25)
| # | Topic | Decision | Where reflected |
|---|---|---|---|
| 1 | Analytics | GA + Search Console exist. **Drop Segment.** | §0, §1.6, §8 steps 3/11/17/18, §10 |
| 2 | Contact form | Destination unknown, so investigate and propose a minimal replacement. Finding: it's Netlify Forms, submissions are in the Netlify dashboard, notifications are UI-only, and no page links to it. **Proposal: a static page with Discussions + `mailto:`** (superseded in round 2: Discussions only). | §1.6, §8 steps 4/11 |
| 3 | help.redash.io | A separate Netlify project, likely not needed. **Optional.** | §1.5, §5.2, §8 step 18 |
| 4 | Netlify app PR previews | Dead. **Drop** (delete root `netlify.toml`). | §2.3, §6.2, §8 steps 11/18 |
| 5 | Versioning | **stable + next + archives, frozen 26.9 archive: yes.** | §0, §4, §8 steps 11b/13/20 |
| 6 | Marketing content | **Keep everything as-is** until the redesign. | §8 step 9 |
| 7 | Unused assets | **Drop.** | §1.4, §8 step 10 |
| 8 | CODEOWNERS | **Skip for now.** | §2.2 |
| 9 | Alexandria | No credits yet. **Free tier only, minimum cost.** | §0, §4 (no R2), §7 |
| 10 | Blog | **Undecided.** Keep the option open, don't build it. | §1.2, §6.2, §8 "Later" |
| — | Monorepo vs separate repo | Trade-off section added. **Final: monorepo.** | §2 |

**Round 2 (Arik, 2026-10-25)**
| # | Topic | Decision | Where reflected |
|---|---|---|---|
| 1 | GA wiring | **TBD, follow up.** | §0, §1.6, §8 steps 3/11/17, §10, §11 |
| 2 | Contact page | **Link to GitHub Discussions only** (no email). | §0, §1.6, §8 steps 4/11 |
| 3 | Search Console | Believed DNS-verified. **Tracked separately.** | §1.6, §11 |
| 4 | Cloudflare token | **Arik creates it.** | §8 step 1, §11 |
| 5 | help.redash.io | **Retire if traffic is negligible.** | §5.2, §8 step 18 |
| 6 | Docs location | **Top-level `/docs` for content, `/website` for the site.** | §0, §2.4, §3.2, §4, §6, §8 steps 6/7, §9, §10 |
