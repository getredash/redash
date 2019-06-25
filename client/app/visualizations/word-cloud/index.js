import { registerVisualization } from '@/visualizations';

import Renderer from './Renderer';
import Editor from './Editor';

export default function init() {
  registerVisualization({
    type: 'WORD_CLOUD',
    name: 'Word Cloud',
    getOptions: options => ({ ...options }),
    Renderer,
    Editor,

    defaultRows: 8,
  });
}

init.init = true;
