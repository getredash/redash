import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { glob } from 'astro/loaders'

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

export const collections = { dataSources, textPages }
