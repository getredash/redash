import TextRenderer from "./TextRenderer";
import getOptions from "./getOptions";
import Editor from "./Editor";

export default {
  type: "TEXT",
  name: "Text (Markdown template)",
  getOptions,
  Renderer: TextRenderer,
  Editor,
  defaultColumns: 2,
  defaultRows: 2,
};
