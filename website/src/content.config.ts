import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { glob } from 'astro/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
// @ts-expect-error -- plain JS module shared with astro.config.mjs
import { DOCS_DIR, docId } from './lib/kb.mjs'

// Data source / integration landing pages (/data-sources/*, /integrations/*).
// Only the frontmatter is used; entries without `path` appear on the
// /integrations/ index but get no page of their own (as on the Gatsby site).
const dataSources = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/data-sources' }),
  schema: z.object({
    title: z.string().optional(),
    name: z.string(),
    logo: z.string(),
    path: z.string().optional(),
  }),
})

// Markdown text pages: /privacy/, /terms/, /community/code_of_conduct/.
const textPages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/text-pages' }),
  schema: z.object({
    title: z.string(),
    path: z.string(),
  }),
})

// Knowledge base (served under /help/): Markdown in /docs at the repository
// root, so it sits next to the code it documents. Ids (= URLs) come from the
// file path, see docId() in src/lib/kb.mjs.
const docs = defineCollection({
  loader: glob({
    base: DOCS_DIR,
    pattern: ['**/*.{md,mdx}', '!**/_*', '!README.md'],
    generateId: ({ entry }) => docId(entry),
  }),
  schema: docsSchema({
    extend: z.object({
      // Carried over from the old knowledge base; rendered as <meta name="keywords">.
      keywords: z.array(z.string()).optional(),
    }),
  }),
})

export const collections = { docs, dataSources, textPages }
