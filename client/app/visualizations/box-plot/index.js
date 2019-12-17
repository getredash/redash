import { registerVisualization } from "@/visualizations";

import Renderer from "./Renderer";
import Editor from "./Editor";

export default function init() {
  registerVisualization({
    type: "BOXPLOT",
    name: "Boxplot (Deprecated)",
    isDeprecated: true,
    getOptions: options => ({ ...options }),
    Renderer,
    Editor,

    defaultRows: 8,
    minRows: 5,
  });
}

init.init = true;
