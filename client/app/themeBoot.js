// Sets the colour theme on <html> before the page is painted, so dark pages don't flash light while loading.
// Loaded as a blocking <script> at the top of <head>: a file rather than inline code because of the Content
// Security Policy. Plain ES5 without imports, copied as is (not bundled). The app keeps the preferences it
// knows in localStorage (see services/theme.js); `?theme=light|dark|system` in the URL overrides them, which is
// handy for embeds and TV screens. Flask-rendered pages provide the organization default in data-default-theme.
(function () {
  var root = document.documentElement;
  var preference = null;
  try {
    var override = /[?&]theme=(light|dark|system)(?:&|$)/.exec(window.location.search);
    if (override) {
      preference = override[1];
    } else {
      // public dashboards and embeds use the organization default, the rest of the app the user's choice
      var isPublic = /\/(public|embed)\//.test(window.location.pathname);
      preference = window.localStorage.getItem(isPublic ? "redash.theme.default" : "redash.theme");
    }
  } catch (_e) {
    // localStorage is unavailable (e.g. blocked in a sandboxed iframe): use the default below
  }
  preference = preference || root.getAttribute("data-default-theme") || "light";
  if (preference === "system") {
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    preference = prefersDark ? "dark" : "light";
  }
  root.setAttribute("data-theme", preference === "dark" ? "dark" : "light");
})();
