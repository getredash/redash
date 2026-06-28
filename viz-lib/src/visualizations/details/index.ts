import getOptions from "./getOptions";
import Renderer from "./Renderer";
import Editor from "./Editor";

export default {
  type: "DETAILS",
  name: "Details View",
  getOptions,
  Renderer,
  Editor,
  defaultColumns: 4,
  defaultRows: 2,
};
