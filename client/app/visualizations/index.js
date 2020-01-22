import { find } from "lodash";
import PropTypes from "prop-types";

/* --------------------------------------------------------
  Types
-----------------------------------------------------------*/

const VisualizationOptions = PropTypes.object; // eslint-disable-line react/forbid-prop-types

const Data = PropTypes.shape({
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
});

export const VisualizationType = PropTypes.shape({
  id: PropTypes.number,
  type: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  options: VisualizationOptions.isRequired, // eslint-disable-line react/forbid-prop-types
});

// For each visualization's renderer
export const RendererPropTypes = {
  visualizationName: PropTypes.string,
  data: Data.isRequired,
  options: VisualizationOptions.isRequired,
  onOptionsChange: PropTypes.func, // (newOptions) => void
  context: PropTypes.oneOf(["query", "widget"]).isRequired,
};

// For each visualization's editor
export const EditorPropTypes = {
  visualizationName: PropTypes.string,
  data: Data.isRequired,
  options: VisualizationOptions.isRequired,
  onOptionsChange: PropTypes.func.isRequired, // (newOptions) => void
};

/* --------------------------------------------------------
  Visualizations registry
-----------------------------------------------------------*/

export const registeredVisualizations = {};

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

function validateVisualizationConfig(config) {
  const typeSpecs = { config: VisualizationConfig };
  const values = { config };
  PropTypes.checkPropTypes(typeSpecs, values, "prop", "registerVisualization");
}

export function registerVisualization(config) {
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

/* --------------------------------------------------------
  Helpers
-----------------------------------------------------------*/

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
