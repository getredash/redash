// @ts-nocheck

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
import addressablePieVisualization from "./addressable-pie";

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
  Renderer: (...args: any[]) => any;
  Editor?: (...args: any[]) => any;
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

const registeredVisualizations = {};

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

  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  if (registeredVisualizations[config.type]) {
    throw new Error(`Visualization ${config.type} already registered.`);
  }

  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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
    addressablePieVisualization,
  ]),
  registerVisualization
);

export default registeredVisualizations;

export function getDefaultVisualization() {
  // return any visualization explicitly marked as default, or any non-deprecated otherwise
  return (
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'isDefault' does not exist on type 'never... Remove this comment to see the full error message
    find(registeredVisualizations, visualization => visualization.isDefault) ||
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'isDeprecated' does not exist on type 'ne... Remove this comment to see the full error message
    find(registeredVisualizations, visualization => !visualization.isDeprecated)
  );
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
