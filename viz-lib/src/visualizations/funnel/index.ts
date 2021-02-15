import getOptions from "./getOptions";
import Renderer from "./Renderer";
import Editor from "./Editor";

export default {
  type: "FUNNEL",
  name: "Funnel",
  getOptions,
  Renderer,
  Editor,

  defaultRows: 10,
};
