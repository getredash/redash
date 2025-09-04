import * as Plotly from "plotly.js";

import "./locales"
import prepareData from "./prepareData";
import prepareLayout from "./prepareLayout";
import updateData from "./updateData";
import updateAxes from "./updateAxes";
import updateChartSize from "./updateChartSize";
import { prepareCustomChartData, createCustomChartRenderer } from "./customChartUtils";

Plotly.setPlotConfig({
  modeBarButtonsToRemove: ["sendDataToCloud"],
  modeBarButtonsToAdd: ["togglespikelines", "v1hovermode"],
  locale: window.navigator.language,
});

export {
  Plotly,
  prepareData,
  prepareLayout,
  updateData,
  updateAxes,
  updateChartSize,
  prepareCustomChartData,
  createCustomChartRenderer,
};
