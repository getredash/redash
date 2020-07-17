import { isObject, isNumber } from "lodash";

function calculateAxisRange(range, min, max) {
  return [isNumber(min) ? min : range[0], isNumber(max) ? max : range[1]];
}

export default function updateYRanges(plotlyElement, layout, options) {
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

      if (options.alignYAxesAtZero && isObject(layout.yaxis) && isObject(layout.yaxis2)) {
        const commonRange = [
          Math.min(updates.yaxis.range[0], updates.yaxis2.range[0]),
          Math.max(updates.yaxis.range[1], updates.yaxis2.range[1]),
        ];
        updates.yaxis.range = [...commonRange];
        updates.yaxis2.range = [...commonRange];
      }

      return [updates, null]; // no further updates
    },
  ];
}
