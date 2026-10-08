import { escape } from "lodash";
import { Marked } from "marked";

// Show raw HTML in the source as text rather than rendering it,
// like the `markdown` package we used before did.
const marked = new Marked({
  renderer: {
    html({ text }) {
      return escape(text);
    },
  },
});

export default function markdownToHtml(text) {
  return marked.parse(text || "", { async: false });
}
