import preparePieData from "./preparePieData";
import prepareHeatmapData from "./prepareHeatmapData";
import prepareDefaultData from "./prepareDefaultData";
import updateData from "./updateData";

export default function prepareData(seriesList: any, options: any) {
  switch (options.globalSeriesType) {
    case "pie":
      return updateData(preparePieData(seriesList, options), options);
    case "heatmap":
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
      return updateData(prepareHeatmapData(seriesList, options, options));
    default:
      return updateData(prepareDefaultData(seriesList, options), options);
  }
}
