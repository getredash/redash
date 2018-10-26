import registry from '@/visualizations/registry';
import PivotRenderer from './PivotRenderer';
import PivotEditor from './PivotEditor';

registry.PIVOT = Object.freeze({
  name: 'Pivot Table',
  renderer: PivotRenderer,
  editor: PivotEditor,
  defaultOptions: PivotRenderer.DEFAULT_OPTIONS,
});
