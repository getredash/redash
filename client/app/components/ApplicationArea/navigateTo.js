import { startsWith } from "lodash";
import location from "@/services/location";
import url from "@/services/url";

export default function navigateTo(href, replace = false) {
  // Allow calling chain to roll up, and then navigate
  setTimeout(() => {
    // Resolve provided link and '' (root) relative to document's base.
    // `a.href` contains absolute variant of `a[href]` attribute.
    // If provided href is not related to current document (does not
    // start with resolved root) - redirect to that URL. Otherwise
    // strip root (it ends with slash, so restore it) and update history.
    const baseHref = url.normalize("");
    href = url.normalize(href);

    if (!startsWith(href, baseHref)) {
      window.location = href;
      return;
    }

    href = `/${href.substr(baseHref.length)}`;

    location.update(href, replace);
  }, 10);
}
