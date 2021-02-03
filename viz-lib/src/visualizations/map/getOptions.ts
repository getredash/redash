import { merge } from "lodash";

export type LeafletBaseIconType = "marker" | "rectangle" | "circle" | "rectangle-dot" | "circle-dot" | "doughnut";
export interface MapOptionsType {
  latColName: string;
  lonColName: string;
  classify: any;
  groups: Record<string, any>;
  mapTileUrl: string;
  clusterMarkers: boolean;
  customizeMarkers: boolean;
  iconShape: LeafletBaseIconType;
  iconFont: LeafletBaseIconType;
  foregroundColor: string;
  backgroundColor: string;
  borderColor: string;
  bounds: any;
  tooltip: {
    enabled: boolean;
    template: string;
  };
  popup: {
    enabled: boolean;
    template: string;
  };
}

const DEFAULT_OPTIONS: MapOptionsType = {
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

export default function getOptions(options: MapOptionsType) {
  options = merge({}, DEFAULT_OPTIONS, options);
  options.mapTileUrl = options.mapTileUrl || DEFAULT_OPTIONS.mapTileUrl;

  // Backward compatibility
  if (options.classify === "none") {
    options.classify = null;
  }

  return options;
}
