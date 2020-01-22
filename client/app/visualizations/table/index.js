import { registerVisualization } from "@/visualizations";

import getOptions from "./getOptions";
import Renderer from "./Renderer";
import Editor from "./Editor";

export default function init() {
  registerVisualization({
    type: "TABLE",
    name: "Table",
    getOptions,
    Renderer,
    Editor,

    autoHeight: true,
    defaultRows: 14,
    defaultColumns: 3,
    minColumns: 2,
  });
}

init.init = true;
