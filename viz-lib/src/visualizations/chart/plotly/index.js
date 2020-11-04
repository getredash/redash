import Plotly from "plotly.js/lib/core";
import bar from "plotly.js/lib/bar";
import pie from "plotly.js/lib/pie";
import histogram from "plotly.js/lib/histogram";
import box from "plotly.js/lib/box";
import heatmap from "plotly.js/lib/heatmap";

import prepareData from "./prepareData";
import prepareGroupedData from "./prepareGroupedData";
import prepareLayout from "./prepareLayout";
import prepareGroupedLayout from "./prepareGroupedLayout";
import updateData from "./updateData";
import updateYRanges from "./updateYRanges";
import updateChartSize from "./updateChartSize";
import updateAxesInversion from "./updateAxesInversion";
import { prepareCustomChartData, createCustomChartRenderer } from "./customChartUtils";

Plotly.register([bar, pie, histogram, box, heatmap]);
Plotly.setPlotConfig({
  modeBarButtonsToRemove: ["sendDataToCloud"],
});

export {
  Plotly,
  prepareData,
  prepareGroupedData,
  prepareLayout,
  prepareGroupedLayout,
  updateData,
  updateYRanges,
  updateAxesInversion,
  updateChartSize,
  prepareCustomChartData,
  createCustomChartRenderer,
};
