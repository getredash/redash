if (
  navigator.appVersion.match("Trident/") || // IE8-11
  "ActiveXObject" in window // IE<11
) {
  window.location.href = "/static/unsupported.html";
}
