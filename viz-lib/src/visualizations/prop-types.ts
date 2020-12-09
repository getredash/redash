import PropTypes from "prop-types";

const VisualizationOptions = PropTypes.object;
type VisualizationOptions = any;

type Data = {
    columns: any[];
    rows: any[];
}; // eslint-disable-line react/forbid-prop-types

const Data: PropTypes.Requireable<Data> = PropTypes.shape({
    columns: PropTypes.arrayOf(PropTypes.object).isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired,
});

type VisualizationType = {
    id?: number;
    type: string;
    name: string;
    options: VisualizationOptions;
};

// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ id: Requireable<num... Remove this comment to see the full error message
const VisualizationType: PropTypes.Requireable<VisualizationType> = PropTypes.shape({
    id: PropTypes.number,
    type: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    options: VisualizationOptions.isRequired,
});
export { VisualizationType };

// For each visualization's renderer
export const RendererPropTypes = {
  visualizationName: PropTypes.string,
  data: Data.isRequired,
  options: VisualizationOptions.isRequired,
  onOptionsChange: PropTypes.func, // (newOptions) => void
};

// For each visualization's editor
export const EditorPropTypes = {
  visualizationName: PropTypes.string,
  data: Data.isRequired,
  options: VisualizationOptions.isRequired,
  onOptionsChange: PropTypes.func.isRequired, // (newOptions) => void
};
