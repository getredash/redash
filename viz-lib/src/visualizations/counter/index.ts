import Renderer from "./Renderer";
import Editor from "./Editor";

const DEFAULT_OPTIONS = {
  counterLabel: "",
  counterColName: "counter",
  rowNumber: 1,
  targetRowNumber: 1,
  stringDecimal: 0,
  stringDecChar: ".",
  stringThouSep: ",",
  tooltipFormat: "0,0.000", // TODO: Show in editor
};

export default {
  type: "COUNTER",
  name: "Counter",
  getOptions: (options: any) => ({
    ...DEFAULT_OPTIONS,
    ...options,
  }),
  Renderer,
  Editor,

  defaultColumns: 4,
  defaultRows: 5,
};
