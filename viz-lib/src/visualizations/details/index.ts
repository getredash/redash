import DetailsRenderer from "./DetailsRenderer";

const DEFAULT_OPTIONS = {};

export default {
  type: "DETAILS",
  name: "Details View",
  getOptions: (options: any) => ({
    ...DEFAULT_OPTIONS,
    ...options,
  }),
  Renderer: DetailsRenderer,
  defaultColumns: 4,
  defaultRows: 2,
};
