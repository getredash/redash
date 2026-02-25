import * as Plotly from "plotly.js";

import "./locales"
import prepareData from "./prepareData";
import prepareLayout from "./prepareLayout";
import updateData from "./updateData";
import updateAxes from "./updateAxes";
import updateChartSize from "./updateChartSize";
import { prepareCustomChartData, createCustomChartRenderer } from "./customChartUtils";

const rangeSliderIcon = {
  'width': 400,
  'height': 400,
  'path': 'M50 180h300a20 20 0 0 1 0 40H50a20 20 0 0 1 0-40z M160 200a40 40 0 1 0 -80 0a40 40 0 1 0 80 0 M320 200a40 40 0 1 0 -80 0a40 40 0 1 0 80 0',
};

Plotly.setPlotConfig({
  modeBarButtonsToRemove: ["sendDataToCloud"],
  modeBarButtonsToAdd: ["togglespikelines", "v1hovermode",
    {
      name: 'toggleRangeslider',
      title: 'Toggle rangeslider',
      icon: rangeSliderIcon,
      click: function(gd: any) {
        if(gd?.layout?.xaxis) {
          let newRangeslider: any = {};
          if (gd.layout.xaxis?.rangeslider) {
            newRangeslider = null;
          }
          (Plotly.relayout as any)(gd, 'xaxis.rangeslider', newRangeslider);
        }
      }
    },
  ],
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
