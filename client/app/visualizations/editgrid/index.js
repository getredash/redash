import { registerVisualization } from "@/visualizations";

import Editor from "./Editor";
import Renderer from "./Renderer";

const DEFAULT_OPTIONS = {
  isMarkingUser: false,
  isVersioning: false,
  isSnapshotting: false,
  allowDelete: true,
  columns: {},
};

export default function init() {
  registerVisualization({
    type: "EDITGRID",
    name: "Editable Grid",
    getOptions: (options) => ({ ...DEFAULT_OPTIONS, ...options }),
    Renderer,
    Editor,

    defaultColumns: 4,
    defaultRows: 15,
  });
}

init.init = true;
