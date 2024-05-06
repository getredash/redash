import Renderer from "./Renderer";
import Editor from "./Editor";

const DEFAULT_OPTIONS = {
  counterLabel: "",
  counterColName: "counter",
  rowNumber: 1,
  targetRowNumber: 1,
  tooltipFormat: {
    style: "decimal",
    minimumFractionDigits: 3,
  },
};

export default {
  type: "COUNTER",
  name: "Counter",
  getOptions: (options: any) => ({
    ...DEFAULT_OPTIONS,
    ...options
  }),
  Renderer,
  Editor,
  defaultColumns: 2,
  defaultRows: 5,
};
