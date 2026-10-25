import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import starlight from '@astrojs/starlight'
import { unified } from '@astrojs/markdown-remark'
import rehypeLegacyAnchors from './src/plugins/rehype-legacy-anchors.mjs'
import rehypeDocsBase from './src/plugins/rehype-docs-base.mjs'
import { buildSidebar, DOCS_BASE, IS_ARCHIVE } from './src/lib/kb.mjs'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))

// Archived docs versions for the version switcher (see src/lib/kb.mjs).
process.env.DOCS_VERSIONS ??= JSON.stringify(JSON.parse(fs.readFileSync(r('./versions.json'), 'utf8')).archives)

export default defineConfig({
  site: 'https://redash.io',
  // URLs match the Gatsby site: every page is a directory with a trailing slash.
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    starlight({
      title: 'Redash Docs',
      logo: { src: './src/assets/redash-logo.svg', alt: 'Redash' },
      favicon: '/assets/images/favicon.ico',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/getredash/redash' }],
      editLink: { baseUrl: 'https://github.com/getredash/redash/edit/master/website/' },
      sidebar: buildSidebar(),
      customCss: ['./src/styles/docs.css'],
      components: {
        Head: './src/components/docs/Head.astro',
        MarkdownContent: './src/components/docs/MarkdownContent.astro',
        Banner: './src/components/docs/Banner.astro',
        SocialIcons: './src/components/docs/SocialIcons.astro',
      },
      // Archived versions are searched through the latest index (see build-site.mjs).
      pagefind: !IS_ARCHIVE,
      // The marketing site provides /404.
      disable404Route: true,
    }),
    react(),
    sitemap(),
  ],
  markdown: {
    // remark/rehype pipeline (Starlight's asides need it).
    processor: unified({ rehypePlugins: [rehypeLegacyAnchors, [rehypeDocsBase, { base: DOCS_BASE }]] }),
  },
  vite: {
    // /docs lives outside the Astro project root.
    server: { fs: { allow: ['..'] } },
    resolve: {
      alias: {
        // Import aliases used by the components ported from the Gatsby site.
        components: r('./src/react/components'),
        data: r('./src/data'),
        // Webpack-style `~module` paths used by the legacy SCSS.
        '~bootstrap-sass': r('./node_modules/bootstrap-sass'),
        '~font-awesome': r('./node_modules/font-awesome'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          // Bootstrap 3 and the legacy styles use pre-module Sass (@import,
          // slash division, global functions). Keep the output identical and
          // the build log readable until the redesign replaces them.
          quietDeps: true,
          silenceDeprecations: [
            'import',
            'global-builtin',
            'slash-div',
            'color-functions',
          ],
        },
      },
    },
  },
})
