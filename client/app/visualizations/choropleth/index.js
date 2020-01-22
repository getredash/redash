import { registerVisualization } from "@/visualizations";

import getOptions from "./getOptions";
import Renderer from "./Renderer";
import Editor from "./Editor";

export default function init() {
  registerVisualization({
    type: "CHOROPLETH",
    name: "Map (Choropleth)",
    getOptions,
    Renderer,
    Editor,

    defaultColumns: 3,
    defaultRows: 8,
    minColumns: 2,
  });
}

init.init = true;
