import { registerVisualization } from "@/visualizations";

import getOptions from "./getOptions";
import Renderer from "./Renderer";
import Editor from "./Editor";

export default function init() {
  registerVisualization({
    type: "FUNNEL",
    name: "Funnel",
    getOptions,
    Renderer,
    Editor,

    defaultRows: 10,
  });
}

init.init = true;
