import { merge } from "lodash";
import { registerVisualization } from "@/visualizations";

import Renderer from "./Renderer";
import Editor from "./Editor";

const DEFAULT_OPTIONS = {
  column: "",
  frequenciesColumn: "",
  wordLengthLimit: { min: null, max: null },
  wordCountLimit: { min: null, max: null },
};

export default function init() {
  registerVisualization({
    type: "WORD_CLOUD",
    name: "Word Cloud",
    getOptions: options => merge({}, DEFAULT_OPTIONS, options),
    Renderer,
    Editor,

    defaultRows: 8,
  });
}

init.init = true;
