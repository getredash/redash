import Plotly from "plotly.js/lib/core";
import bar from "plotly.js/lib/bar";
import pie from "plotly.js/lib/pie";
import histogram from "plotly.js/lib/histogram";
import box from "plotly.js/lib/box";
import heatmap from "plotly.js/lib/heatmap";

import prepareData from "./prepareData";
import prepareLayout from "./prepareLayout";
import updateData from "./updateData";
import applyLayoutFixes from "./applyLayoutFixes";
import { prepareCustomChartData, createCustomChartRenderer } from "./customChartUtils";

Plotly.register([bar, pie, histogram, box, heatmap]);
Plotly.setPlotConfig({
  modeBarButtonsToRemove: ["sendDataToCloud"],
});

export {
  Plotly,
  prepareData,
  prepareLayout,
  updateData,
  applyLayoutFixes,
  prepareCustomChartData,
  createCustomChartRenderer,
};
