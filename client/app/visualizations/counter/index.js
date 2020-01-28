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
  showTooltip: true,
  tooltipFormat: "0,0.000",
};

export default {
  type: "COUNTER",
  name: "Counter",
  getOptions: options => ({ ...DEFAULT_OPTIONS, ...options }),
  Renderer,
  Editor,

  defaultColumns: 2,
  defaultRows: 5,
};
