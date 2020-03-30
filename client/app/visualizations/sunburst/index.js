import Renderer from "./Renderer";
import Editor from "./Editor";

export default {
  type: "SUNBURST_SEQUENCE",
  name: "Sunburst Sequence",
  getOptions: options => ({ ...options }),
  Renderer,
  Editor,

  defaultRows: 7,
};
