import { isNumber } from 'lodash';
import { registerVisualization } from '@/visualizations';

import counterEditorTemplate from './counter-editor.html';

import Renderer from './Renderer';
import Editor from './Editor';

const DEFAULT_OPTIONS = {
  counterLabel: '',
  counterColName: 'counter',
  rowNumber: 1,
  targetRowNumber: 1,
  stringDecimal: 0,
  stringDecChar: '.',
  stringThouSep: ',',
  tooltipFormat: '0,0.000', // TODO: Show in editor
};

// TODO: Need to review this function, it does not properly handle edge cases.
function getRowNumber(index, size) {
  if (index >= 0) {
    return index - 1;
  }

  if (Math.abs(index) > size) {
    index %= size;
  }

  return size + index;
}

const CounterEditor = {
  template: counterEditorTemplate,
  bindings: {
    data: '<',
    options: '<',
    visualizationName: '<',
    onOptionsChange: '<',
  },
  controller($scope) {
    this.currentTab = 'general';
    this.changeTab = (tab) => {
      this.currentTab = tab;
    };

    this.isValueNumber = () => {
      const options = this.options;
      const data = this.data.rows;

      if (data.length > 0) {
        const rowNumber = getRowNumber(options.rowNumber, data.length);
        const counterColName = options.counterColName;

        if (options.countRow) {
          this.counterValue = data.length;
        } else if (counterColName) {
          this.counterValue = data[rowNumber][counterColName];
        }
      }

      return isNumber(this.counterValue);
    };

    $scope.$watch('$ctrl.options', (options) => {
      this.onOptionsChange(options);
    }, true);
  },
};

export default function init(ngModule) {
  ngModule.component('counterEditor', CounterEditor);

  registerVisualization({
    type: 'COUNTER',
    name: 'Counter',
    getOptions: options => ({ ...DEFAULT_OPTIONS, ...options }),
    Renderer,
    Editor,

    defaultColumns: 2,
    defaultRows: 5,
  });
}

init.init = true;
