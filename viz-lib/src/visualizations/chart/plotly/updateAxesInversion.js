import { each, isObject } from "lodash";
import { merge } from "lodash";
export default function updateAxesInversion(seriesList, layout, options) {
  const updates = {};

  if (options.invertedAxes) {
    each(seriesList, series => {
      series.orientation = "h";
      const { x, y } = series;
      series.x = y;
      series.y = x;
    });

    // const { xaxis, yaxis } = layout;
    // if (isObject(xaxis) && isObject(yaxis)) {
    //   updates.xaxis = merge({}, yaxis);
    //   updates.yaxis = merge({}, xaxis);
    // }
  }

  return [updates, () => {
    if (options.invertedAxes) {
      const { xaxis, yaxis } = layout;
      
      if (isObject(xaxis) && isObject(yaxis)) {
        updates.xaxis = yaxis;
        updates.yaxis = xaxis;
      }
    }
  
    return [updates, null]
  }];
}
