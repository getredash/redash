import getOptions from "./getOptions";
import Renderer from "./Renderer";
import Editor from "./Editor";

export default {
  type: "ADDRESSABLE TABLE",
  name: "Table (Addressable)",
  getOptions,
  Renderer,
  Editor,

  autoHeight: true,
  defaultRows: 14,
  defaultColumns: 3,
  minColumns: 2,
};
