import { isObject, filter } from "lodash";
import { calculateAxisRange } from "./utils";

export default function updateLayout(layout, options, seriesList) {
  // Use only visible series
  const visibleSeriesList = filter(seriesList, s => s.visible === true);

  if (isObject(layout.yaxis)) {
    const series = visibleSeriesList.filter(s => s.yaxis !== "y2");
    const axisOptions = options.yAxis[0];
    layout.yaxis.range = calculateAxisRange(series, axisOptions.rangeMin, axisOptions.rangeMax);
  }
  if (isObject(layout.yaxis2)) {
    const series = visibleSeriesList.filter(s => s.yaxis === "y2");
    const axisOptions = options.yAxis[1];
    layout.yaxis2.range = calculateAxisRange(series, axisOptions.rangeMin, axisOptions.rangeMax);
  }
}
