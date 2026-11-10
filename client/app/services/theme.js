import { useEffect, useState } from "react";

// The colour theme of the UI.
//
// A preference is "light", "dark" or "system" (follow the operating system). The active theme, always "light" or
// "dark", is set as <html data-theme="..."> and the styles switch on it (see assets/less/themes/tokens.less).
// The preference comes from, in order: `?theme=` in the URL, the user's profile, the organization default.
//
// The last known preferences are cached in localStorage, so that themeBoot.js can apply the theme before the app
// has loaded: "redash.theme" for the app, "redash.theme.default" for public dashboards and embeds.

export const THEMES = ["light", "dark", "system"];

const USER_KEY = "redash.theme";
const DEFAULT_KEY = "redash.theme.default";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set();
let preference = null;
let isPublicPage = false;
let theme = readTheme();
let systemQuery = null;

function readTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function isTheme(value) {
  return THEMES.indexOf(value) >= 0;
}

function getUrlOverride() {
  const match = /[?&]theme=(light|dark|system)(?:&|$)/.exec(window.location.search);
  return match ? match[1] : null;
}

function prefersDark() {
  return !!window.matchMedia && window.matchMedia(DARK_QUERY).matches;
}

function store(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_e) {
    // Not cached: the theme still applies, the next page load may briefly show the default
  }
}

function onSystemChange() {
  update();
}

function watchSystemTheme(enabled) {
  if (!window.matchMedia) {
    return;
  }
  if (enabled && !systemQuery) {
    systemQuery = window.matchMedia(DARK_QUERY);
    systemQuery.addEventListener("change", onSystemChange);
  } else if (!enabled && systemQuery) {
    systemQuery.removeEventListener("change", onSystemChange);
    systemQuery = null;
  }
}

function update() {
  const next = preference === "dark" || (preference === "system" && prefersDark()) ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  watchSystemTheme(preference === "system");
  if (next !== theme) {
    theme = next;
    listeners.forEach((listener) => {
      listener(theme);
    });
  }
}

/**
 * Applies the theme for the current page.
 *
 * @param {object} options
 * @param {string} [options.userTheme] the user's preference, null/undefined to use the organization default
 * @param {string} [options.defaultTheme] the organization default
 * @param {boolean} [options.isPublic] true for public dashboards and embeds, which have no user
 */
export function applyTheme({ userTheme, defaultTheme, isPublic = false } = {}) {
  const orgDefault = isTheme(defaultTheme) ? defaultTheme : "light";
  const ownPreference = isPublic ? orgDefault : isTheme(userTheme) ? userTheme : orgDefault;
  store(DEFAULT_KEY, orgDefault);
  if (!isPublic) {
    store(USER_KEY, ownPreference);
  }
  isPublicPage = isPublic;
  preference = getUrlOverride() || ownPreference;
  update();
}

/** The active theme: "light" or "dark". */
export function getTheme() {
  return theme;
}

/** Calls `listener(theme)` whenever the active theme changes. Returns a function that unsubscribes. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook returning the active theme ("light" or "dark"); the component re-renders when it changes. */
export function useTheme() {
  const [current, setCurrent] = useState(getTheme);
  useEffect(() => {
    setCurrent(getTheme());
    return subscribe(setCurrent);
  }, []);
  return current;
}

// Follow a change made in another tab (the profile setting there updates the cached preference)
window.addEventListener("storage", (event) => {
  if (event.key === USER_KEY && preference !== null && !isPublicPage && !getUrlOverride() && isTheme(event.newValue)) {
    preference = event.newValue;
    update();
  }
});
