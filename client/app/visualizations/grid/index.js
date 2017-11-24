import gridRenderer from './renderer';
import gridEditor from './editor';

export default function init(ngModule) {
  ngModule.directive('advGridRenderer', gridRenderer);
  ngModule.directive('advGridEditor', gridEditor);
  ngModule.config((VisualizationProvider) => {
    const renderTemplate = `
      <adv-grid-renderer options="visualization.options" query-result="queryResult">
      </adv-grid-renderer>
    `;
    const editorTemplate = `
      <adv-grid-editor></adv-grid-editor>
    `;
    const defaultOptions = {
      defaultColumns: 4,
      defaultRows: 15,
      minColumns: 2,
    };

    VisualizationProvider.registerVisualization({
      type: 'GRID',
      name: 'Advanced Table',
      renderTemplate,
      editorTemplate,
      defaultOptions,
    });
  });
}
