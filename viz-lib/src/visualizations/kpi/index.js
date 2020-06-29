import Renderer from "./Renderer";
import Editor from "./Editor";

const DEFAULT_OPTIONS = {
  currentValueColName: "current_value",
  targetValueColName: "target_value",
  valuesFormat: "0,0[.]00",
  percentFormat: "0[.]00%",
};

export default {
  type: "KPI",
  name: "KPI",
  getOptions: options => ({ ...DEFAULT_OPTIONS, ...options }),
  Renderer,
  Editor,

  defaultColumns: 2,
  defaultRows: 5,
}
