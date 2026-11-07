# Redash Docs

This folder is the source of the Redash docs at https://redash.io/help/.
The site that renders it lives in [`/website`](../website).

## Writing docs

- Every Markdown file is a page: `docs/user-guide/alerts/setting-up-an-alert.md`
  is served at `https://redash.io/help/user-guide/alerts/setting-up-an-alert/`.
  A folder's `index.md` is the folder's own page (category pages list their
  articles automatically).
- **Don't rename or move published pages.** The Redash app and many external
  sites link to these URLs. If you must, add a redirect in
  `website/public/_redirects`.
- Frontmatter:
  ```yaml
  ---
  title: Setting Up An Alert      # required, shown as the page heading
  description: One-line summary   # optional, used for search engines and lists
  keywords: [alerts, threshold]   # optional
  sidebar:
    order: 1                      # optional, position within its category
  ---
  ```
- Callouts use [Starlight asides](https://starlight.astro.build/components/asides/):
  `:::note`, `:::tip`, `:::caution` and `:::danger`, closed with `:::`.
- Images: put new images next to the page and link them relatively
  (`![Alert settings](./alert-settings.png)`). Existing images are served from
  `website/public/assets/images/docs/` under their old URLs, because other sites
  link to them.
- Link to other pages with absolute paths like `/help/user-guide/querying/writing-queries/`.

## Versions

`master` is published at `/help/next/` as the unreleased docs. `/help/` shows the
latest release, so changes appear there when they're released. If a fix also
applies to the current release (a typo, a wrong instruction), mention it in the
pull request: maintainers cherry-pick it onto the release branch. See
[website/README.md](../website/README.md#docs-versions).

## Previewing

```sh
cd website
pnpm install
pnpm dev        # http://localhost:4321/help/
```
