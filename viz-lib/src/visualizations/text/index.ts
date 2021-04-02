import Renderer from "./Renderer";
import getOptions from "./getOptions";
import Editor from "./Editor";

export default {
  type: "TEXT",
  name: "Text (Markdown template)",
  getOptions,
  Renderer: Renderer,
  Editor,
  defaultColumns: 2,
  defaultRows: 2,
};
