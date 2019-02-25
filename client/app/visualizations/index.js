import { find } from 'lodash';
import PropTypes from 'prop-types';

export let Visualization = null; // eslint-disable-line import/no-mutable-exports

export const registeredVisualizations = {};

// for `registerVisualization`
export const VisualizationConfig = PropTypes.shape({
  type: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  getOptions: PropTypes.func.isRequired, // (existingOptions: object, data: { columns[], rows[] }) => object
  isDeprecated: PropTypes.bool,
  Renderer: PropTypes.func.isRequired,
  Editor: PropTypes.func,
});

export const VisualizationType = PropTypes.shape({
  type: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  options: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
});

// For each visualization's renderer
export const RendererPropTypes = {
  visualizationName: PropTypes.string,
  data: PropTypes.shape({
    columns: PropTypes.arrayOf(PropTypes.object).isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  options: PropTypes.object.isRequired,
  onOptionsChange: PropTypes.func,
};

// For each visualization's editor
export const EditorPropTypes = {
  visualizationName: PropTypes.string,
  data: PropTypes.shape({
    columns: PropTypes.arrayOf(PropTypes.object).isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  options: PropTypes.object.isRequired,
  onOptionsChange: PropTypes.func,
};

export function registerVisualization(config) {
  config = { ...config }; // clone

  if (registeredVisualizations[config.type]) {
    throw new Error(`Visualization ${config.type} already registered.`);
  }

  registeredVisualizations[config.type] = config;
}

export function getDefaultVisualization() {
  return find(registeredVisualizations, visualization => !visualization.name.match(/Deprecated/));
}

export function newVisualization(type = null) {
  const visualization = type ? registeredVisualizations[type] : getDefaultVisualization();
  return {
    type: visualization.type,
    name: visualization.name,
    description: '',
    options: {},
  };
}

export default function init(ngModule) {
  ngModule.run(($resource) => {
    Visualization = $resource('api/visualizations/:id', { id: '@id' });
  });
}

init.init = true;
