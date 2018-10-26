import registry from '@/visualizations/registry';
import SankeyRenderer from './SankeyRenderer';
import SankeyEditor from './SankeyEditor';

registry.SANKEY = Object.freeze({
  name: 'Sankey',
  renderer: SankeyRenderer,
  editor: SankeyEditor,
  defaultOptions: SankeyRenderer.DEFAULT_OPTIONS,
});
