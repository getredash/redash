import { registerVisualization } from "@/visualizations";

import Renderer from "./Renderer";
import Editor from "./Editor";

export default function init() {
  registerVisualization({
    type: "SUNBURST_SEQUENCE",
    name: "Sunburst Sequence",
    getOptions: options => ({ ...options }),
    Renderer,
    Editor,

    defaultRows: 7,
  });
}

init.init = true;
