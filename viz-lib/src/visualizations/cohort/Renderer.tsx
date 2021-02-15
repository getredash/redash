import React, { useMemo } from "react";
import { RendererPropTypes } from "@/visualizations/prop-types";

import prepareData from "./prepareData";
import "./renderer.less";

import Cornelius from "./Cornelius";

export default function Renderer({
  data,
  options
}: any) {
  const { data: cohortData, initialDate } = useMemo(() => prepareData(data, options), [data, options]);

  const corneliusOptions = useMemo(
    () => ({
      initialDate,
      timeInterval: options.timeInterval,

      noValuePlaceholder: options.noValuePlaceholder,
      rawNumberOnHover: options.showTooltips,
      displayAbsoluteValues: !options.percentValues,

      timeColumnTitle: options.timeColumnTitle,
      peopleColumnTitle: options.peopleColumnTitle,
      stageColumnTitle: options.stageColumnTitle,

      numberFormat: options.numberFormat,
      percentFormat: options.percentFormat,

      colors: options.colors,
    }),
    [options, initialDate]
  );

  if (cohortData.length === 0) {
    return null;
  }

  return (
    <div className="cohort-visualization-container">
      <Cornelius data={cohortData} options={corneliusOptions} />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
