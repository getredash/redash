import { find, pick, reduce } from "lodash";

function fixLegendContainer(plotlyElement) {
  const legend = plotlyElement.querySelector(".legend");
  if (legend) {
    let node = legend.parentNode;
    while (node) {
      if (node.tagName.toLowerCase() === "svg") {
        node.style.overflow = "visible";
        break;
      }
      node = node.parentNode;
    }
  }
}

export default function applyLayoutFixes(plotlyElement, layout, updatePlot) {
  // update layout size to plot container
  layout.width = Math.floor(plotlyElement.offsetWidth);
  layout.height = Math.floor(plotlyElement.offsetHeight);

  const transformName = find(
    ["transform", "WebkitTransform", "MozTransform", "MsTransform", "OTransform"],
    prop => prop in plotlyElement.style
  );

  if (layout.width <= 600) {
    // change legend orientation to horizontal; plotly has a bug with this
    // legend alignment - it does not preserve enough space under the plot;
    // so we'll hack this: update plot (it will re-render legend), compute
    // legend height, reduce plot size by legend height (but not less than
    // half of plot container's height - legend will have max height equal to
    // plot height), re-render plot again and offset legend to the space under
    // the plot.
    layout.legend = {
      orientation: "h",
      // locate legend inside of plot area - otherwise plotly will preserve
      // some amount of space under the plot; also this will limit legend height
      // to plot's height
      y: 0,
      x: 0,
      xanchor: "left",
      yanchor: "bottom",
    };

    // set `overflow: visible` to svg containing legend because later we will
    // position legend outside of it
    fixLegendContainer(plotlyElement);

    updatePlot(plotlyElement, pick(layout, ["width", "height", "legend"])).then(() => {
      const legend = plotlyElement.querySelector(".legend"); // eslint-disable-line no-shadow
      if (legend) {
        // compute real height of legend - items may be split into few columnns,
        // also scrollbar may be shown
        const bounds = reduce(
          legend.querySelectorAll(".traces"),
          (result, node) => {
            const b = node.getBoundingClientRect();
            result = result || b;
            return {
              top: Math.min(result.top, b.top),
              bottom: Math.max(result.bottom, b.bottom),
            };
          },
          null
        );
        // here we have two values:
        // 1. height of plot container excluding height of legend items;
        //    it may be any value between 0 and plot container's height;
        // 2. half of plot containers height. Legend cannot be larger than
        //    plot; if legend is too large, plotly will reduce it's height and
        //    show a scrollbar; in this case, height of plot === height of legend,
        //    so we can split container's height half by half between them.
        layout.height = Math.floor(Math.max(layout.height / 2, layout.height - (bounds.bottom - bounds.top)));
        // offset the legend
        legend.style[transformName] = "translate(0, " + layout.height + "px)";
        updatePlot(plotlyElement, pick(layout, ["height"]));
      }
    });
  } else {
    layout.legend = {
      orientation: "v",
      // vertical legend will be rendered properly, so just place it to the right
      // side of plot
      y: 1,
      x: 1,
      xanchor: "left",
      yanchor: "top",
    };

    const legend = plotlyElement.querySelector(".legend");
    if (legend) {
      legend.style[transformName] = null;
    }

    updatePlot(plotlyElement, pick(layout, ["width", "height", "legend"]));
  }
}
