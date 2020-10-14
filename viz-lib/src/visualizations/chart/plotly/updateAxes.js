import { isObject, isNumber, each } from "lodash";

function calculateAxisRange(range, min, max) {
  return [isNumber(min) ? min : range[0], isNumber(max) ? max : range[1]];
}

export default function updateAxes(plotlyElement, seriesList, layout, options) {
  const updates = {};
  if (isObject(layout.yaxis)) {
    updates.yaxis = {
      ...layout.yaxis,
      autorange: true,
      range: null,
    };
  }
  if (isObject(layout.yaxis2)) {
    updates.yaxis2 = {
      ...layout.yaxis2,
      autorange: true,
      range: null,
    };
  }

  return [
    updates,
    () => {
      // Update Y Ranges
      if (isObject(layout.yaxis)) {
        const axisOptions = options.yAxis[0];
        const defaultRange = plotlyElement.layout.yaxis.range;
        updates.yaxis.autorange = false;
        updates.yaxis.range = calculateAxisRange(defaultRange, axisOptions.rangeMin, axisOptions.rangeMax);
      }

      if (isObject(layout.yaxis2)) {
        const axisOptions = options.yAxis[1];
        const defaultRange = plotlyElement.layout.yaxis2.range;
        updates.yaxis2.autorange = false;
        updates.yaxis2.range = calculateAxisRange(defaultRange, axisOptions.rangeMin, axisOptions.rangeMax);
      }

      // Invert Axes
      if (options.swappedAxes) {
        each(seriesList, series => {
          series.orientation = "h";
          const { x, y } = series;
          series.x = y;
          series.y = x;
        });

        const { xaxis } = layout;
        const { yaxis, yaxis2 } = updates;

        if (isObject(xaxis) && isObject(yaxis)) {
          updates.xaxis = yaxis;
          updates.yaxis = xaxis;
        }
        if (isObject(yaxis2)) {
          updates.yaxis2 = null;
        }
      }

      return [updates, null]; // no further updates
    },
  ];
}
