import TextRenderer from "./TextRenderer";

const DEFAULT_OPTIONS = {};

export default {
  type: "TEXT",
  name: "Text (Markdown template)",
  getOptions: (options: any) => ({
    ...DEFAULT_OPTIONS,
    ...options,
  }),
  Renderer: TextRenderer,
  defaultColumns: 2,
  defaultRows: 2,
};
