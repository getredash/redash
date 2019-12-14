import { merge } from "lodash";

const DEFAULT_OPTIONS = {
  latColName: "lat",
  lonColName: "lon",
  classify: null,
  groups: {},
  mapTileUrl: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  clusterMarkers: true,
  customizeMarkers: false,
  iconShape: "marker",
  iconFont: "circle",
  foregroundColor: "#ffffff",
  backgroundColor: "#356AFF",
  borderColor: "#356AFF",
  bounds: null,
  tooltip: {
    enabled: false,
    template: "",
  },
  popup: {
    enabled: true,
    template: "",
  },
};

export default function getOptions(options) {
  options = merge({}, DEFAULT_OPTIONS, options);
  options.mapTileUrl = options.mapTileUrl || DEFAULT_OPTIONS.mapTileUrl;

  // Backward compatibility
  if (options.classify === "none") {
    options.classify = null;
  }

  return options;
}
