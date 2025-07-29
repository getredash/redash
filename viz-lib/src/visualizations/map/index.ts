import getOptions from "./getOptions";
import Renderer from "./Renderer";
import Editor from "./Editor";

export default {
  type: "MAP",
  name: "Map (Markers)",
  getOptions,
  Renderer,
  Editor,

  defaultColumns: 6,
  defaultRows: 8,
  minColumns: 2,
};
