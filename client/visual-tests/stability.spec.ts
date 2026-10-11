import { expect, test } from "@playwright/test";
import { stabilizeEmbedUrls, stabilizePage, waitForPageReady } from "./stable-page";

test("shifted dates allow app startup through native timers and animation frames", async ({ page }) => {
  await stabilizePage(page);
  await page.goto('data:text/html,<div id="application-root"></div>');
  const before = await page.evaluate(() => {
    const started = performance.now();
    setTimeout(() => {
      requestAnimationFrame(() => {
        const content = document.createElement("span");
        content.textContent = String(performance.now() - started);
        document.getElementById("application-root")?.appendChild(content);
      });
    }, 50);
    return Date.now();
  });

  await waitForPageReady(page);
  expect(Number(await page.locator("#application-root span").textContent())).toBeGreaterThan(0);
  expect(before).toBeGreaterThanOrEqual(Date.parse("2026-01-15T12:00:00Z"));
  expect(before).toBeLessThan(Date.parse("2026-01-15T12:01:00Z"));
  expect(await page.evaluate((start) => Date.now() - start, before)).toBeGreaterThan(0);
  expect(await page.evaluate(() => setTimeout.toString())).toContain("[native code]");
  expect(await page.evaluate(() => requestAnimationFrame.toString())).toContain("[native code]");
});

test("embed URL length does not change the code block layout", async ({ page }) => {
  await page.setContent(`
    <style>code { display: block; width: 438px; font: 13px monospace; overflow-wrap: anywhere; }</style>
    <div class="embed-query-dialog"><code></code><code></code></div>
  `);
  const code = page.locator("code");
  const params = "?api_key=example&p_period=2012-01-01--2012-12-31&p_country=All&p_limit=10";
  let expectedText: string[] | undefined;
  let expectedHeights: number[] | undefined;
  for (const url of [
    `http://localhost:5000/embed/query/25/visualization/97${params}`,
    `https://a-longer-test-host.example:5106/embed/query/123456/visualization/987654${params}`,
  ]) {
    await code.evaluateAll((blocks, address) => {
      blocks[0].textContent = address;
      blocks[1].textContent = `<iframe src="${address}" width="720" height="391"></iframe>`;
    }, url);
    await stabilizeEmbedUrls(page);
    const text = await code.allTextContents();
    const heights = await code.evaluateAll((blocks) => blocks.map((block) => block.getBoundingClientRect().height));
    expect(text[0]).toBe(`https://redash.example/embed/query/1/visualization/1${params}`);
    expect(text[1]).toContain('width="720" height="391"');
    if (expectedText) {
      expect(text).toEqual(expectedText);
      expect(heights).toEqual(expectedHeights);
    }
    expectedText = text;
    expectedHeights = heights;
  }
});
