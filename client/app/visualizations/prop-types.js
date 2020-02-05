import PropTypes from "prop-types";

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
