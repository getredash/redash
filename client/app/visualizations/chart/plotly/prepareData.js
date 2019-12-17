import preparePieData from "./preparePieData";
import prepareHeatmapData from "./prepareHeatmapData";
import prepareDefaultData from "./prepareDefaultData";
import updateData from "./updateData";

export default function prepareData(seriesList, options) {
  switch (options.globalSeriesType) {
    case "pie":
      return updateData(preparePieData(seriesList, options), options);
    case "heatmap":
      return updateData(prepareHeatmapData(seriesList, options, options));
    default:
      return updateData(prepareDefaultData(seriesList, options), options);
  }
}
