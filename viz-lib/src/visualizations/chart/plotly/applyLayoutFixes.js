import { pick } from "lodash";

function placeLegendNextToPlot(layout) {
  layout.legend = {
    orientation: "v",
    // vertical legend will be rendered properly, so just place it to the right
    // side of plot
    y: 1,
    x: 1,
    xanchor: "left",
    yanchor: "top",
  };
}

function placeLegendBelowPlot(layout) {
  layout.legend = {
    orientation: "h",
    y: -0.2,
  };
}

function placeLegendAuto(layout) {
  if (layout.width <= 600) {
    placeLegendBelowPlot(layout);
  } else {
    placeLegendNextToPlot(layout);
  }
}

export default function applyLayoutFixes(plotlyElement, layout, options, updatePlot) {
  // update layout size to plot container
  // plot size should be at least 5x5px
  layout.width = Math.max(5, Math.floor(plotlyElement.offsetWidth));
  layout.height = Math.max(5, Math.floor(plotlyElement.offsetHeight));

  if (options.legend.enabled) {
    switch (options.legend.placement) {
      case "auto":
        placeLegendAuto(layout);
        break;
      case "below":
        placeLegendBelowPlot(layout);
        break;
      // no default
    }
  }

  updatePlot(plotlyElement, pick(layout, ["width", "height", "legend"]));
}
