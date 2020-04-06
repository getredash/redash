import Renderer from "./Renderer";
import Editor from "./Editor";

export default {
  type: "SANKEY",
  name: "Sankey",
  getOptions: options => ({ ...options }),
  Renderer,
  Editor,

  defaultRows: 7,
};
