import { registerVisualization } from "@/visualizations";

import Renderer from "./Renderer";
import Editor from "./Editor";

export default function init() {
  registerVisualization({
    type: "SANKEY",
    name: "Sankey",
    getOptions: options => ({ ...options }),
    Renderer,
    Editor,

    defaultRows: 7,
  });
}

init.init = true;
