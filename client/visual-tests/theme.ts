import { test as base } from "@playwright/test";

export type Theme = "light" | "dark";

/** `test` with a `theme` option: the projects for the dark theme set it to "dark" (see playwright.config.ts). */
export const test = base.extend<{ theme: Theme }>({
  theme: ["light", { option: true }],
});

/** Adds `?theme=dark` to an app path for the dark theme (the URL override of the user's preference). */
export function withTheme(path: string, theme: Theme): string {
  if (theme === "light") {
    return path;
  }
  const url = new URL(path, "http://placeholder");
  url.searchParams.set("theme", theme);
  return `${url.pathname}${url.search}${url.hash}`;
}
