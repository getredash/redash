import React from 'react';
import { find, flatten, each } from "lodash";
import PropTypes from "prop-types";

import boxPlotVisualization from "./box-plot";
import chartVisualization from "./chart";
import choroplethVisualization from "./choropleth";
import cohortVisualization from "./cohort";
import counterVisualization from "./counter";
import detailsVisualization from "./details";
import funnelVisualization from "./funnel";
import mapVisualization from "./map";
import pivotVisualization from "./pivot";
import tableVisualization from "./table";
import sankeyVisualization from "./sankey";
import sunburstVisualization from "./sunburst";
import wordCloudVisualization from "./word-cloud";
import addressableTableVisualization from "./addressable-table";
import addressableCounterVisualization from "./addressable-counter";

import verticalBarChartVisualization from "./custom/vertical-bar-chart";
import horizontalBarChartVisualization from "./custom/horizontal-bar-chart";
import pieChartVisualization from "./custom/pie-chart";
import listVisualization from "./custom/list";
import multiLineChartVisualization from "./custom/multi-line-chart";
import singleLineChartVisualization from "./custom/single-line-chart";

type VisualizationConfig = {
  type: string;
  name: string;
  getOptions: (...args: any[]) => any;
  isDefault?: boolean;
  isDeprecated?: boolean;
  Renderer: (...args: any[]) => JSX.Element;
  Editor: (...args: any[]) => JSX.Element;
  autoHeight?: boolean;
  defaultRows?: number;
  defaultColumns?: number;
  minRows?: number;
  maxRows?: number;
  minColumns?: number;
  maxColumns?: number;
};

// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ type: Validator<str... Remove this comment to see the full error message
const VisualizationConfig: PropTypes.Requireable<VisualizationConfig> = PropTypes.shape({
  type: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  getOptions: PropTypes.func.isRequired,
  isDefault: PropTypes.bool,
  isDeprecated: PropTypes.bool,
  Renderer: PropTypes.func.isRequired,
  Editor: PropTypes.func,
  // other config options
  autoHeight: PropTypes.bool,
  defaultRows: PropTypes.number,
  defaultColumns: PropTypes.number,
  minRows: PropTypes.number,
  maxRows: PropTypes.number,
  minColumns: PropTypes.number,
  maxColumns: PropTypes.number,
});

const registeredVisualizations: Record<string, VisualizationConfig> = {};

function validateVisualizationConfig(config: any) {
  const typeSpecs = { config: VisualizationConfig };
  const values = { config };
  PropTypes.checkPropTypes(typeSpecs, values, "prop", "registerVisualization");
}

function registerVisualization(config: any) {
  validateVisualizationConfig(config);
  config = {
    Editor: () => null,
    ...config,
    isDefault: config.isDefault && !config.isDeprecated,
  };

  if (registeredVisualizations[config.type]) {
    throw new Error(`Visualization ${config.type} already registered.`);
  }

  registeredVisualizations[config.type] = config;
}

each(
  flatten([
    boxPlotVisualization,
    chartVisualization,
    choroplethVisualization,
    cohortVisualization,
    counterVisualization,
    detailsVisualization,
    funnelVisualization,
    mapVisualization,
    pivotVisualization,
    sankeyVisualization,
    sunburstVisualization,
    tableVisualization,
    wordCloudVisualization,
    verticalBarChartVisualization,
    horizontalBarChartVisualization,
    pieChartVisualization,
    listVisualization,
    multiLineChartVisualization,
    singleLineChartVisualization,
    addressableTableVisualization,
    addressableCounterVisualization,
  ]),
  registerVisualization
);

export default registeredVisualizations;

export function getDefaultVisualization () {
  // return any visualization explicitly marked as default, or any non-deprecated otherwise
  return (
    find(registeredVisualizations, visualization => visualization.isDefault ?? false) ??
    find(registeredVisualizations, visualization => !visualization.isDeprecated)
  );
}

export function getUnknownVisualization (type: string) : VisualizationConfig {
  return {
    type: "unknown",
    name: "Unknown",
    Renderer: () => (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", fontSize: "1.25em" }}>
        <span>Unknown visualization type: { type }</span>
      </div>
    ),
    Editor: () => (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", fontSize: "1.25em" }}>
        <span>Unknown visualization type: { type }</span>
      </div>
    ),
    getOptions: (options: any) => options
  };
}

export function newVisualization(type = null, options = {}) {
  const visualization = type ? registeredVisualizations[type] : getDefaultVisualization() as any;
  return {
    type: visualization.type,
    name: visualization.name,
    description: "",
    options,
  };
}
