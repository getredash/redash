import { registerVisualization } from "@/visualizations";

import getOptions from "./getOptions";
import Renderer from "./Renderer";
import Editor from "./Editor";

export default function init() {
  registerVisualization({
    type: "MAP",
    name: "Map (Markers)",
    getOptions,
    Renderer,
    Editor,

    defaultColumns: 3,
    defaultRows: 8,
    minColumns: 2,
  });
}

init.init = true;
