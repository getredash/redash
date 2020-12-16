import Plotly from "plotly.js/lib/core";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'plot... Remove this comment to see the full error message
import bar from "plotly.js/lib/bar";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'plot... Remove this comment to see the full error message
import pie from "plotly.js/lib/pie";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'plot... Remove this comment to see the full error message
import histogram from "plotly.js/lib/histogram";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'plot... Remove this comment to see the full error message
import box from "plotly.js/lib/box";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'plot... Remove this comment to see the full error message
import heatmap from "plotly.js/lib/heatmap";

import prepareData from "./prepareData";
import prepareLayout from "./prepareLayout";
import updateData from "./updateData";
import updateAxes from "./updateAxes";
import updateChartSize from "./updateChartSize";
import { prepareCustomChartData, createCustomChartRenderer } from "./customChartUtils";

// @ts-expect-error ts-migrate(2339) FIXME: Property 'register' does not exist on type 'typeof... Remove this comment to see the full error message
Plotly.register([bar, pie, histogram, box, heatmap]);
// @ts-expect-error ts-migrate(2339) FIXME: Property 'setPlotConfig' does not exist on type 't... Remove this comment to see the full error message
Plotly.setPlotConfig({
  modeBarButtonsToRemove: ["sendDataToCloud"],
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
