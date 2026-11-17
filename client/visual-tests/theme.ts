import { test as base } from "@playwright/test";

export type Theme = "light" | "dark";

/** `test` with a `theme` option: the projects for the dark theme set it to "dark" (see playwright.config.ts). */
export const test = base.extend<{ theme: Theme }>({
  theme: ["light", { option: true }],
});

/** Adds `?theme=` to an app path (the URL override of the user's preference), so the theme doesn't depend on it. */
export function withTheme(path: string, theme: Theme): string {
  const url = new URL(path, "http://placeholder");
  url.searchParams.set("theme", theme);
  return `${url.pathname}${url.search}${url.hash}`;
}
