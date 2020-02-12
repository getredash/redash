import Renderer from "./Renderer";
import Editor from "./Editor";
import getOptions from "./getOptions";

export default {
  type: "COUNTER",
  name: "Counter",
  getOptions,
  Renderer,
  Editor,

  defaultColumns: 2,
  defaultRows: 5,
};
