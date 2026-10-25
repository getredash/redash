import fs from 'node:fs'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { pages } from './pages'

const REFERENCE_URL = process.env.REFERENCE_URL ?? 'https://redash.io'
const CACHE_DIR = path.resolve(import.meta.dirname, '../../.vrt-cache')
const REFRESH = !!process.env.REFRESH_REFERENCE

// Make both sites deterministic before taking a screenshot.
async function settle(page: Page) {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation: none !important; transition: none !important; caret-color: transparent !important;
    }`,
  })
  // Load every lazy image, then return to the top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 50))
    }
    window.scrollTo(0, 0)
  })
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => new Promise((r) => img.addEventListener('load', r) || img.addEventListener('error', r)))
    )
  )
  // Stop videos; their content is masked below (same file on both sites).
  await page.evaluate(() => document.querySelectorAll('video').forEach((v) => v.pause()))
  await page.evaluate(() => document.fonts.ready)
  // Drop invisible tracking iframes (e.g. the 1x1 frame Segment injects on the old site).
  await page.evaluate(() =>
    document.querySelectorAll('iframe').forEach((f) => {
      const { width, height } = f.getBoundingClientRect()
      if (width < 5 || height < 5) f.remove()
    })
  )
}

// Content that changes between loads: third-party widgets (GitHub star
// counts) and video frames. Masked boxes are still compared for size/position.
const MASKS = ['.github-button', 'iframe', 'video']

// Deliberate differences from the old site, applied to the reference page so
// everything else is still compared pixel for pixel.
async function applyIntendedChanges(page: Page) {
  await page.evaluate(() => {
    // "Knowledge Base" is now called "Docs" (header, footer).
    document.querySelectorAll('a').forEach((a) => {
      if (a.textContent?.trim() === 'Knowledge Base') a.textContent = 'Docs'
    })
  })
}

type Action = (page: Page) => Promise<void>

async function screenshot(page: Page, url: string, action?: Action, reference = false): Promise<Buffer> {
  const response = await page.goto(url, { waitUntil: 'networkidle' })
  expect(response?.status(), `${url} status`).toBe(200)
  await settle(page)
  if (reference) await applyIntendedChanges(page)
  if (action) await action(page)
  return page.screenshot({
    fullPage: !action,
    mask: MASKS.map((s) => page.locator(s)),
    maskColor: '#ff00ff',
  })
}

function parity(name: string, pathname: string, action?: Action, projects?: string[]) {
  test(name, async ({ page }, testInfo) => {
    test.skip(!!projects && !projects.includes(testInfo.project.name), 'not applicable at this viewport')
    const slug =
      (pathname === '/' ? 'home' : pathname.replace(/^\/|\/$/g, '').replace(/\//g, '__')) +
      (action ? `--${name.replace(/\W+/g, '-')}` : '')
    const cached = path.join(CACHE_DIR, testInfo.project.name, `${slug}.png`)

    let reference: Buffer
    if (!REFRESH && fs.existsSync(cached)) {
      reference = fs.readFileSync(cached)
    } else {
      reference = await screenshot(page, REFERENCE_URL + pathname, action, true)
      fs.mkdirSync(path.dirname(cached), { recursive: true })
      fs.writeFileSync(cached, reference)
    }
    const candidate = await screenshot(page, pathname, action)

    const ref = PNG.sync.read(reference)
    const cand = PNG.sync.read(candidate)
    await testInfo.attach('reference', { body: reference, contentType: 'image/png' })
    await testInfo.attach('candidate', { body: candidate, contentType: 'image/png' })

    const width = Math.max(ref.width, cand.width)
    const height = Math.max(ref.height, cand.height)
    const pad = (img: PNG) => {
      if (img.width === width && img.height === height) return img
      const out = new PNG({ width, height })
      PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0)
      return out
    }
    const diff = new PNG({ width, height })
    const changed = pixelmatch(pad(ref).data, pad(cand).data, diff.data, width, height, { threshold: 0.1 })
    if (changed > 0) {
      const diffPng = PNG.sync.write(diff)
      await testInfo.attach('diff', { body: diffPng, contentType: 'image/png' })
      fs.writeFileSync(testInfo.outputPath('reference.png'), reference)
      fs.writeFileSync(testInfo.outputPath('candidate.png'), candidate)
      fs.writeFileSync(testInfo.outputPath('diff.png'), diffPng)
    }

    expect.soft({ width: cand.width, height: cand.height }, 'page size').toEqual({ width: ref.width, height: ref.height })
    expect(changed, `${changed} pixels differ`).toBe(0)
  })
}

for (const pathname of pages) parity(`parity ${pathname}`, pathname)

// Navbar behaviour reimplemented without React: compare the open states too.
parity(
  'navbar: Help dropdown open',
  '/',
  async (page) => {
    await page.click('.navbar .dropdown-toggle')
  },
  ['desktop']
)
parity(
  'navbar: mobile menu open',
  '/',
  async (page) => {
    await page.click('.navbar-toggle')
    await page.click('.navbar .dropdown-toggle')
  },
  ['tablet', 'mobile']
)
