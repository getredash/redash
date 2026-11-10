function mockMatchMedia(dark) {
  const query = { matches: dark, addEventListener: jest.fn(), removeEventListener: jest.fn() };
  window.matchMedia = jest.fn(() => query);
  return query;
}

function loadTheme() {
  let theme;
  jest.isolateModules(() => {
    theme = require("./theme");
  });
  return theme;
}

function setSearch(search) {
  window.history.replaceState(null, "", `/${search}`);
}

describe("theme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    window.localStorage.clear();
    setSearch("");
    mockMatchMedia(false);
  });

  test("uses the organization default when the user has no preference", () => {
    const { applyTheme, getTheme } = loadTheme();
    applyTheme({ userTheme: null, defaultTheme: "dark" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(getTheme()).toBe("dark");
  });

  test("the user's preference wins over the organization default", () => {
    const { applyTheme } = loadTheme();
    applyTheme({ userTheme: "light", defaultTheme: "dark" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("falls back to light for unknown or missing values", () => {
    const { applyTheme } = loadTheme();
    applyTheme({ userTheme: "purple", defaultTheme: undefined });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("system follows the operating system and its changes", () => {
    const query = mockMatchMedia(true);
    const { applyTheme, getTheme } = loadTheme();
    applyTheme({ userTheme: "system" });
    expect(getTheme()).toBe("dark");

    query.matches = false;
    const [, onChange] = query.addEventListener.mock.calls[0];
    onChange();
    expect(getTheme()).toBe("light");
  });

  test("the URL parameter overrides the preference and isn't cached", () => {
    setSearch("?theme=dark");
    const { applyTheme } = loadTheme();
    applyTheme({ userTheme: "light", defaultTheme: "light" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem("redash.theme")).toBe("light");
  });

  test("caches the preferences for themeBoot.js", () => {
    const { applyTheme } = loadTheme();
    applyTheme({ userTheme: "system", defaultTheme: "dark" });
    expect(window.localStorage.getItem("redash.theme")).toBe("system");
    expect(window.localStorage.getItem("redash.theme.default")).toBe("dark");
  });

  test("public pages use the organization default and leave the user's cached preference alone", () => {
    window.localStorage.setItem("redash.theme", "light");
    const { applyTheme } = loadTheme();
    applyTheme({ defaultTheme: "dark", isPublic: true });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem("redash.theme")).toBe("light");
  });

  test("notifies subscribers when the active theme changes", () => {
    const { applyTheme, subscribe } = loadTheme();
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);
    applyTheme({ userTheme: "dark" });
    applyTheme({ userTheme: "dark" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("dark");

    unsubscribe();
    applyTheme({ userTheme: "light" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
