import registry from '@/visualizations/registry';
import CounterRenderer from './CounterRenderer';
import CounterEditor from './CounterEditor';

registry.COUNTER = Object.freeze({
  name: 'Counter',
  renderer: CounterRenderer,
  editor: CounterEditor,
  defaultOptions: CounterRenderer.DEFAULT_OPTIONS,
});
