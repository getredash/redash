// From Nextjs

export function getLocationOrigin() {
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}${port ? ":" + port : ""}`;
}
function pathNoQueryHash(path: string) {
  const queryIndex = path.indexOf("?");
  const hashIndex = path.indexOf("#");

  if (queryIndex > -1 || hashIndex > -1) {
    path = path.substring(0, queryIndex > -1 ? queryIndex : hashIndex);
  }
  return path;
}

export function hasBasePath(path: string): boolean {
  path = pathNoQueryHash(path);
  return path === "" || path.startsWith("/");
}

export function isLocalURL(url: string): boolean {
  // prevent a hydration mismatch on href for url with anchor refs
  if (url.startsWith("/") || url.startsWith("#")) return true;
  try {
    // absolute urls can be local if they are on the same origin
    const locationOrigin = getLocationOrigin();
    const resolved = new URL(url, locationOrigin);
    return resolved.origin === locationOrigin && hasBasePath(resolved.pathname);
  } catch (_) {
    return false;
  }
}
