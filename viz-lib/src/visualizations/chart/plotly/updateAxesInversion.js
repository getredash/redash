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

    const { xaxis, yaxis, yaxis2 } = layout;
    if (isObject(xaxis) && isObject(yaxis)) {
      layout.xaxis = yaxis;
      layout.yaxis = xaxis;
      // if (isObject(yaxis2)) {
      //   layout.xaxis2 = yaxis2;
      // }
    }
  }

  return [updates, null];
}
