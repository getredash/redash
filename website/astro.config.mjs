import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  site: 'https://redash.io',
  // URLs match the Gatsby site: every page is a directory with a trailing slash.
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [react(), sitemap()],
  vite: {
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
