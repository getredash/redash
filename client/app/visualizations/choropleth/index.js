import registry from '@/visualizations/registry';
import ChoroplethRenderer from './ChoroplethRenderer';
import ChoroplethEditor from './ChoroplethEditor';

registry.CHOROPLETH = Object.freeze({
  name: 'Map (Choropleth)',
  renderer: ChoroplethRenderer,
  editor: ChoroplethEditor,
  defaultOptions: ChoroplethRenderer.DEFAULT_OPTIONS,
});
