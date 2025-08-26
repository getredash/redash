import getOptions from "./getOptions";
import Renderer from "./Renderer";
import Editor from "./Editor";

export default {
  type: "CHART",
  name: "Chart",
  isDefault: true,
  getOptions,
  Renderer,
  Editor,

  defaultColumns: 6,
  defaultRows: 8,
  minColumns: 1,
  minRows: 5,
};
