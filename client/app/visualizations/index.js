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
import sankeyVisualization from "./sankey";
import sunburstVisualization from "./sunburst";
import tableVisualization from "./table";
import wordCloudVisualization from "./word-cloud";

const VisualizationConfig = PropTypes.shape({
  type: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  getOptions: PropTypes.func.isRequired, // (existingOptions: object, data: { columns[], rows[] }) => object
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

function validateVisualizationConfig(config) {
  const typeSpecs = { config: VisualizationConfig };
  const values = { config };
  PropTypes.checkPropTypes(typeSpecs, values, "prop", "registerVisualization");
}

function registerVisualization(config) {
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
  ]),
  registerVisualization
);

export default registeredVisualizations;

export function getDefaultVisualization() {
  // return any visualization explicitly marked as default, or any non-deprecated otherwise
  return (
    find(registeredVisualizations, visualization => visualization.isDefault) ||
    find(registeredVisualizations, visualization => !visualization.isDeprecated)
  );
}

export function newVisualization(type = null, options = {}) {
  const visualization = type ? registeredVisualizations[type] : getDefaultVisualization();
  return {
    type: visualization.type,
    name: visualization.name,
    description: "",
    options,
  };
}
