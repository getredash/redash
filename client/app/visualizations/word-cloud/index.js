import { registerVisualization } from '@/visualizations';

import Renderer from './Renderer';
import Editor from './Editor';

const DEFAULT_OPTIONS = {
  column: '',
  frequenciesColumn: '',
};

export default function init() {
  registerVisualization({
    type: 'WORD_CLOUD',
    name: 'Word Cloud',
    getOptions: options => ({ ...DEFAULT_OPTIONS, ...options }),
    Renderer,
    Editor,

    defaultRows: 8,
  });
}

init.init = true;
