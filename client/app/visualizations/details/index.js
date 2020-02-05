import DetailsRenderer from "./DetailsRenderer";

const DEFAULT_OPTIONS = {};

export default {
  type: "DETAILS",
  name: "Details View",
  getOptions: options => ({ ...DEFAULT_OPTIONS, ...options }),
  Renderer: DetailsRenderer,
  defaultColumns: 2,
  defaultRows: 2,
};
