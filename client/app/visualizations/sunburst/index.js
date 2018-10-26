import registry from '@/visualizations/registry';
import SunburstRenderer from './SunburstRenderer';
import SunburstEditor from './SunburstEditor';

registry.SUNBURST_SEQUENCE = Object.freeze({
  name: 'Sunburst Sequence',
  renderer: SunburstRenderer,
  editor: SunburstEditor,
  defaultOptions: SunburstRenderer.DEFAULT_OPTIONS,
});
