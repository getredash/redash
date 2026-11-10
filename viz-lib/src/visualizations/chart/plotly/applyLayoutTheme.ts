import { each, merge } from "lodash";

// Plotly draws the chart's chrome (background, text, grid, axis lines) with its own colours, which suit a light page.
// In the dark theme, recolour the chrome to match the page; the data colours are never changed.
// The colours are read from the app's theme tokens when available (see client/app/assets/less/themes/tokens.less),
// with fallbacks for when the library is used on its own.

function cssColor(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export default function applyLayoutTheme(layout: any, theme?: string) {
  if (theme !== "dark") {
    return layout;
  }

  const text = cssColor("--rd-text", "#c4ccd5");
  const muted = cssColor("--rd-text-muted", "#8a96a3");
  const grid = cssColor("--rd-border-split", "#29303a");
  const line = cssColor("--rd-border", "#3a434f");

  merge(layout, {
    paper_bgcolor: "rgba(0, 0, 0, 0)",
    plot_bgcolor: "rgba(0, 0, 0, 0)",
    font: { color: text },
    modebar: { bgcolor: "rgba(0, 0, 0, 0)", color: muted, activecolor: text },
  });
  each(layout, (value, key) => {
    if (/^[xy]axis\d*$/.test(key)) {
      merge(value, { gridcolor: grid, zerolinecolor: line, linecolor: line });
    }
  });
  return layout;
}
