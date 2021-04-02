import TextRenderer from "./TextRenderer";
import getOptions from "./getOptions";

export default {
  type: "TEXT",
  name: "Text (Markdown template)",
  getOptions,
  Renderer: TextRenderer,
  defaultColumns: 2,
  defaultRows: 2,
};
