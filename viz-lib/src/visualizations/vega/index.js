import Editor from "./Editor";
import Renderer from "./Renderer";
import { DEFAULT_OPTIONS } from "./consts";

export default {
  type: "VEGA",
  name: "Vega",
  isDefault: true,
  getOptions: options => ({ ...DEFAULT_OPTIONS, ...options }),
  Renderer,
  Editor,
  defaultRows: 8,
  defaultColumns: 3,
};
