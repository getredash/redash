import Renderer from "./Renderer";
import Editor from "./Editor";
export interface SankeyDataType {
  columns: {
    name: string;
    friendly_name: string;
    type: "integer";
  }[];

  rows: {
    [name: string]: number;
    value: number;
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
