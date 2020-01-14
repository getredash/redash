import location from "@/services/location";
import url from "@/services/url";
import { stripBase } from "./Router";

export default function navigateTo(href, replace = false) {
  // Allow calling chain to roll up, and then navigate
  setTimeout(() => {
    const isExternal = stripBase(href) === false;
    if (isExternal) {
      window.location = href;
      return;
    }
    location.update(url.parse(href), replace);
  }, 10);
}
