import { each, isObject } from "lodash";
export default function updateAxesInversion(seriesList, layout, options) {
  const updates = {};

  if (options.invertedAxes) {
    each(seriesList, series => {
      series.orientation = "h";
      const { x, y } = series;
      series.x = y;
      series.y = x;
    });
  }

  return [
    updates,
    () => {
      if (options.invertedAxes) {
        const { xaxis, yaxis, yaxis2 } = layout;
        if (isObject(xaxis) && isObject(yaxis)) {
          updates.xaxis = yaxis;
          updates.yaxis = xaxis;
        }
        if (isObject(yaxis2)) {
          // TODO add xaxis2
          updates.yaxis2 = null;
        }
      }

      return [updates, null];
    },
  ];
}
