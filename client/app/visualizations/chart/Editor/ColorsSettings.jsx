import React from "react";
import { EditorPropTypes } from "@/visualizations";

import PieColorsSettings from "./PieColorsSettings";
import HeatmapColorsSettings from "./HeatmapColorsSettings";
import DefaultColorsSettings from "./DefaultColorsSettings";

const components = {
  pie: PieColorsSettings,
  heatmap: HeatmapColorsSettings,
};

export default function ColorsSettings({ options, ...props }) {
  const Component = components[options.globalSeriesType] || DefaultColorsSettings;
  return <Component options={options} {...props} />;
}

ColorsSettings.propTypes = EditorPropTypes;
