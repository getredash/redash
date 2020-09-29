import { isString } from "lodash";
import DOMPurify from "dompurify";

DOMPurify.setConfig({
  ADD_ATTR: ["target"],
});

DOMPurify.addHook("afterSanitizeAttributes", function(node) {
  // Fix elements with `target` attribute:
  // - allow only `target="_blank"
  // - add `rel="noopener noreferrer"` to prevent https://www.owasp.org/index.php/Reverse_Tabnabbing

  const target = node.getAttribute("target");
  if (isString(target) && target.toLowerCase() === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  } else {
    node.removeAttribute("target");
  }
});

export { DOMPurify };

export default DOMPurify.sanitize;
