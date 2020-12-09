import { isObject, isUndefined, filter, map } from "lodash";
import { getPieDimensions } from "./preparePieData";

function getAxisTitle(axis) {
  return isObject(axis.title) ? axis.title.text : null;
}

function getAxisScaleType(axis) {
  switch (axis.type) {
    case "datetime":
      return "date";
    case "logarithmic":
      return "log";
    default:
      return axis.type;
  }
}

function prepareXAxis(axisOptions, additionalOptions) {
  const axis = {
    title: getAxisTitle(axisOptions),
    type: getAxisScaleType(axisOptions),
    automargin: true,
  };

  if (additionalOptions.sortX && axis.type === "category") {
    if (additionalOptions.reverseX) {
      axis.categoryorder = "category descending";
    } else {
      axis.categoryorder = "category ascending";
    }
  }

  if (!isUndefined(axisOptions.labels)) {
    axis.showticklabels = axisOptions.labels.enabled;
  }

  return axis;
}

function prepareYAxis(axisOptions) {
  return {
    title: getAxisTitle(axisOptions),
    type: getAxisScaleType(axisOptions),
    automargin: true,
    autorange: true,
    range: null,
  };
}

function preparePieLayout(layout, options, data) {
  const hasName = /{{\s*@@name\s*}}/.test(options.textFormat);

  const { cellsInRow, cellWidth, cellHeight, xPadding } = getPieDimensions(data);

  if (hasName) {
    layout.annotations = [];
  } else {
    layout.annotations = filter(
      map(data, (series, index) => {
        const xPosition = (index % cellsInRow) * cellWidth;
        const yPosition = Math.floor(index / cellsInRow) * cellHeight;
        return {
          x: xPosition + (cellWidth - xPadding) / 2,
          y: yPosition + cellHeight - 0.015,
          xanchor: "center",
          yanchor: "top",
          text: series.name,
          showarrow: false,
        };
      })
    );
  }

  return layout;
}

function prepareDefaultLayout(layout, options, data) {
  const y2Series = data.filter(s => s.yaxis === "y2");

  layout.xaxis = prepareXAxis(options.xAxis, options);

  layout.yaxis = prepareYAxis(options.yAxis[0]);
  if (y2Series.length > 0) {
    layout.yaxis2 = prepareYAxis(options.yAxis[1]);
    layout.yaxis2.overlaying = "y";
    layout.yaxis2.side = "right";
  }

  if (options.series.stacking) {
    layout.barmode = "relative";
  }

  return layout;
}

function prepareBoxLayout(layout, options, data) {
  layout = prepareDefaultLayout(layout, options, data);
  layout.boxmode = "group";
  layout.boxgroupgap = 0.5;
  return layout;
}

export default function prepareLayout(element, options, data) {
  const layout = {
    margin: { l: 10, r: 10, b: 5, t: 20, pad: 4 },
    // plot size should be at least 5x5px
    width: Math.max(5, Math.floor(element.offsetWidth)),
    height: Math.max(5, Math.floor(element.offsetHeight)),
    autosize: false,
    showlegend: options.legend.enabled,
    legend: {
      traceorder: options.legend.traceorder,
    },
  };

  switch (options.globalSeriesType) {
    case "pie":
      return preparePieLayout(layout, options, data);
    case "box":
      return prepareBoxLayout(layout, options, data);
    default:
      return prepareDefaultLayout(layout, options, data);
  }
}
