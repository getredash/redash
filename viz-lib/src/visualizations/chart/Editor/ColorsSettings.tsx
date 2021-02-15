import React from "react";
import { EditorPropTypes } from "@/visualizations/prop-types";

import PieColorsSettings from "./PieColorsSettings";
import HeatmapColorsSettings from "./HeatmapColorsSettings";
import DefaultColorsSettings from "./DefaultColorsSettings";

const components = {
  pie: PieColorsSettings,
  heatmap: HeatmapColorsSettings,
};

export default function ColorsSettings({
  options,
  ...props
}: any) {
  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const Component = components[options.globalSeriesType] || DefaultColorsSettings;
  return <Component options={options} {...props} />;
}

ColorsSettings.propTypes = EditorPropTypes;
