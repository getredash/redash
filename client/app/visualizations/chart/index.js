import registry from '@/visualizations/registry';
import ChartRenderer from './ChartRenderer';
import ChartEditor from './ChartEditor';

registry.CHART = Object.freeze({
  name: 'Chart',
  renderer: ChartRenderer,
  editor: ChartEditor,
  defaultOptions: ChartRenderer.DEFAULT_OPTIONS,
});

