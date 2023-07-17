import { isString } from "lodash";
import navigateTo from "./navigateTo";

export default function handleNavigationIntent(event) {
  let element = event.target;
  while (element) {
    if (element.tagName === "A") {
      break;
    }
    element = element.parentNode;
  }
  if (!element || !element.hasAttribute("href") || element.hasAttribute("download") || element.dataset.skipRouter) {
    return;
  }

  // Keep some default behaviour
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return;
  }

  const target = element.getAttribute("target");
  if (isString(target) && target.toLowerCase() === "_blank") {
    return;
  }

  event.preventDefault();

  navigateTo(element.href);
}
