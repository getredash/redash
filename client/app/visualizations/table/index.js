import registry from '@/visualizations/registry';
import GridRenderer from './GridRenderer';
import GridEditor from './GridEditor';

registry.TABLE = Object.freeze({
  name: 'Table',
  renderer: GridRenderer,
  editor: GridEditor,
  defaultOptions: GridRenderer.DEFAULT_OPTIONS,
});

