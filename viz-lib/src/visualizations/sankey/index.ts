import Renderer from "./Renderer";
import Editor from "./Editor";
export interface SankeyDataType {
  columns: {
    name: string;
    friendly_name: string;
    type: "integer";
  }[];

  rows: {
    value: number;
    [name: string]: number | string | null;
  }[];
}

export default {
  type: "SANKEY",
  name: "Sankey",
  getOptions: (options: {}) => ({
    ...options,
  }),
  Renderer,
  Editor,

  defaultRows: 7,
};
