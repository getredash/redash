import { registerVisualization } from "@/visualizations";

import getOptions from "./getOptions";
import Renderer from "./Renderer";
import Editor from "./Editor";

export default function init() {
  registerVisualization({
    type: "COHORT",
    name: "Cohort",
    getOptions,
    Renderer,
    Editor,

    autoHeight: true,
    defaultRows: 8,
  });
}

init.init = true;
