import { registerVisualization } from '@/visualizations';

import Renderer from './Renderer';
import Editor from './Editor';

const DEFAULT_OPTIONS = {
  okRange: 20,
  okColor: '#2ecc71',
  warningRange: 60,
  warningColor: '#f39c12',
  dangerRange: 80,
  dangerColor: '#e74c3c',
};

export default function init() {
  registerVisualization({
    type: 'GAUGE',
    name: 'Gauge',
    getOptions: options => ({ ...DEFAULT_OPTIONS, ...options }),
    Renderer,
    Editor,

    defaultRows: 7,
  });
}

init.init = true;
