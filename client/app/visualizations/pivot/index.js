import { merge } from "lodash";
import { registerVisualization } from "@/visualizations";

import Renderer from "./Renderer";
import Editor from "./Editor";

const DEFAULT_OPTIONS = {
  controls: {
    enabled: false, // `false` means "show controls" o_O
  },
  rendererOptions: {
    table: {
      colTotals: true,
      rowTotals: true,
    },
  },
};

export default function init() {
  registerVisualization({
    type: "PIVOT",
    name: "Pivot Table",
    getOptions: options => merge({}, DEFAULT_OPTIONS, options),
    Renderer,
    Editor,

    defaultRows: 10,
    defaultColumns: 3,
    minColumns: 2,
  });
}

init.init = true;
