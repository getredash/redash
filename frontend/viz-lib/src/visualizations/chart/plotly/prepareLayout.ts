import { isObject, isUndefined, filter, map } from "lodash";
import { getPieDimensions } from "./preparePieData";

function getAxisTitle(axis: any) {
  return isObject(axis.title) ? axis.title.text : null;
}

function getAxisScaleType(axis: any) {
  switch (axis.type) {
    case "datetime":
      return "date";
    case "logarithmic":
      return "log";
    default:
      return axis.type;
  }
}

function prepareXAxis(axisOptions: any, additionalOptions: any) {
  const axis = {
    title: getAxisTitle(axisOptions),
    type: getAxisScaleType(axisOptions),
    automargin: true,
    tickformat: axisOptions.tickFormat ?? null,
  };

  if (additionalOptions.sortX && axis.type === "category") {
    if (additionalOptions.reverseX) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'categoryorder' does not exist on type '{... Remove this comment to see the full error message
      axis.categoryorder = "category descending";
    } else {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'categoryorder' does not exist on type '{... Remove this comment to see the full error message
      axis.categoryorder = "category ascending";
    }
  }

  if (!isUndefined(axisOptions.labels)) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'showticklabels' does not exist on type '... Remove this comment to see the full error message
    axis.showticklabels = axisOptions.labels.enabled;
  }

  return axis;
}

function prepareYAxis(axisOptions: any) {
  return {
    title: getAxisTitle(axisOptions),
    type: getAxisScaleType(axisOptions),
    automargin: true,
    autorange: true,
    range: null,
    tickformat: axisOptions.tickFormat ?? null,
  };
}

function preparePieLayout(layout: any, options: any, data: any) {
  const hasName = /{{\s*@@name\s*}}/.test(options.textFormat);

  const { cellsInRow, cellWidth, cellHeight, xPadding } = getPieDimensions(data);

  if (hasName) {
    layout.annotations = [];
  } else {
    layout.annotations = filter(
      map(data, (series, index) => {
        // @ts-expect-error ts-migrate(2362) FIXME: The left-hand side of an arithmetic operation must... Remove this comment to see the full error message
        const xPosition = (index % cellsInRow) * cellWidth;
        // @ts-expect-error ts-migrate(2362) FIXME: The left-hand side of an arithmetic operation must... Remove this comment to see the full error message
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

function prepareDefaultLayout(layout: any, options: any, data: any) {
  const y2Series = data.filter((s: any) => s.yaxis === "y2");

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

function prepareBoxLayout(layout: any, options: any, data: any) {
  layout = prepareDefaultLayout(layout, options, data);
  layout.boxmode = "group";
  layout.boxgroupgap = 0.5;
  return layout;
}

export default function prepareLayout(element: any, options: any, data: any) {
  const layout: any = {
    margin: { l: 10, r: 10, b: 5, t: 20, pad: 4 },
    // plot size should be at least 5x5px
    width: Math.max(5, Math.floor(element.offsetWidth)),
    height: Math.max(5, Math.floor(element.offsetHeight)),
    autosize: false,
    showlegend: options.legend.enabled,
    legend: {
      traceorder: options.legend.traceorder,
    },
    hoverlabel: {
      namelength: -1,
    },
  };

  if (["line", "area", "column"].includes(options.globalSeriesType)) {
    layout.hovermode = options.swappedAxes ? 'y' : 'x';
  }

  switch (options.globalSeriesType) {
    case "pie":
      return preparePieLayout(layout, options, data);
    case "box":
      return prepareBoxLayout(layout, options, data);
    default:
      return prepareDefaultLayout(layout, options, data);
  }
}
