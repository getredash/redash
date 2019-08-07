import { registerVisualization } from '@/visualizations';
import DetailsRenderer from './DetailsRenderer';
import DetailsEditor from './DetailsEditor';

const DEFAULT_OPTIONS = {};

export default function init() {
  registerVisualization({
    type: 'DETAILS',
    name: 'Details View',
    getOptions: options => ({ ...DEFAULT_OPTIONS, ...options }),
    Renderer: DetailsRenderer,
    Editor: DetailsEditor,

    defaultColumns: 2,
    defaultRows: 2,
  });
}

init.init = true;
