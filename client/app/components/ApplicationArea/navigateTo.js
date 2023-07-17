import location from "@/services/location";
import url from "@/services/url";
import { stripBase } from "./Router";

// When `replace` is set to `true` - it will just replace current URL
// without reloading current page (router will skip this location change)
export default function navigateTo(href, replace = false) {
  // Allow calling chain to roll up, and then navigate
  setTimeout(() => {
    const isExternal = stripBase(href) === false;
    if (isExternal) {
      window.location = href;
      return;
    }
    href = url.parse(href);
    location.update(
      {
        path: href.pathname,
        search: href.search,
        hash: href.hash,
      },
      replace
    );
  }, 10);
}
