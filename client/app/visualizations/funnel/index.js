import registry from '@/visualizations/registry';
import FunnelRenderer from './FunnelRenderer';
import FunnelEditor from './FunnelEditor';

registry.FUNNEL = Object.freeze({
  name: 'Funnel',
  renderer: FunnelRenderer,
  editor: FunnelEditor,
  defaultOptions: FunnelRenderer.DEFAULT_OPTIONS,
});
