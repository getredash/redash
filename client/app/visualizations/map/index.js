import registry from '@/visualizations/registry';
import MapRenderer from './MapRenderer';
import MapEditor from './MapEditor';

registry.MAP = Object.freeze({
  name: 'Map (Markers)',
  renderer: MapRenderer,
  editor: MapEditor,
  defaultOptions: MapRenderer.DEFAULT_OPTIONS,
});
