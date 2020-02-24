import bar from "plotly.js/lib/bar";
import box from "plotly.js/lib/box";
import Plotly from "plotly.js/lib/core";
import heatmap from "plotly.js/lib/heatmap";
import histogram from "plotly.js/lib/histogram";
import pie from "plotly.js/lib/pie";

import applyLayoutFixes from "./applyLayoutFixes";
import {
  createCustomChartRenderer,
  prepareCustomChartData
} from "./customChartUtils";
import prepareData from "./prepareData";
import prepareLayout from "./prepareLayout";
import updateData from "./updateData";

Plotly.register([bar, pie, histogram, box, heatmap]);
Plotly.setPlotConfig({
  modeBarButtonsToRemove: ["sendDataToCloud"]
});

export {
  Plotly,
  prepareData,
  prepareLayout,
  updateData,
  applyLayoutFixes,
  prepareCustomChartData,
  createCustomChartRenderer
};
