import numberFormat from 'underscore.string/numberFormat';
import { isNumber } from 'lodash';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';

import counterTemplate from './counter.html';
import counterEditorTemplate from './counter-editor.html';

const DEFAULT_OPTIONS = {
  counterLabel: '',
  counterColName: 'counter',
  rowNumber: 1,
  targetRowNumber: 1,
  stringDecimal: 0,
  stringDecChar: '.',
  stringThouSep: ',',
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

const CounterRenderer = {
  template: counterTemplate,
  bindings: {
    data: '<',
    options: '<',
    visualizationName: '<',
  },
  controller($scope, $element, $timeout) {
    $scope.fontSize = '1em';

    $scope.scale = 1;
    const root = $element[0].querySelector('counter');
    const container = $element[0].querySelector('counter > div');
    $scope.handleResize = () => {
      const scale = Math.min(root.offsetWidth / container.offsetWidth, root.offsetHeight / container.offsetHeight);
      $scope.scale = Math.floor(scale * 100) / 100; // keep only two decimal places
    };

    const update = () => {
      const options = this.options;
      const data = this.data.rows;

      if (data.length > 0) {
        const rowNumber = getRowNumber(options.rowNumber, data.length);
        const targetRowNumber = getRowNumber(options.targetRowNumber, data.length);
        const counterColName = options.counterColName;
        const targetColName = options.targetColName;
        const counterLabel = options.counterLabel;

        if (counterLabel) {
          $scope.counterLabel = counterLabel;
        } else {
          $scope.counterLabel = this.visualizationName;
        }

        if (options.countRow) {
          $scope.counterValue = data.length;
        } else if (counterColName) {
          $scope.counterValue = data[rowNumber][counterColName];
        }
        if (targetColName) {
          $scope.targetValue = data[targetRowNumber][targetColName];

          if ($scope.targetValue) {
            $scope.delta = $scope.counterValue - $scope.targetValue;
            $scope.trendPositive = $scope.delta >= 0;
          }
        } else {
          $scope.targetValue = null;
        }

        $scope.isNumber = isNumber($scope.counterValue);
        if ($scope.isNumber) {
          $scope.stringPrefix = options.stringPrefix;
          $scope.stringSuffix = options.stringSuffix;

          const stringDecimal = options.stringDecimal;
          const stringDecChar = options.stringDecChar;
          const stringThouSep = options.stringThouSep;
          if (stringDecimal || stringDecChar || stringThouSep) {
            $scope.counterValue = numberFormat($scope.counterValue, stringDecimal, stringDecChar, stringThouSep);
            $scope.isNumber = false;
          }
        } else {
          $scope.stringPrefix = null;
          $scope.stringSuffix = null;
        }
      }

      $timeout(() => {
        $scope.handleResize();
      });
    };

    $scope.$watch('$ctrl.data', update);
    $scope.$watch('$ctrl.options', update, true);
  },
};

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
  ngModule.component('counterRenderer', CounterRenderer);
  ngModule.component('counterEditor', CounterEditor);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'COUNTER',
      name: 'Counter',
      getOptions: options => ({ ...DEFAULT_OPTIONS, ...options }),
      Renderer: angular2react('counterRenderer', CounterRenderer, $injector),
      Editor: angular2react('counterEditor', CounterEditor, $injector),

      defaultColumns: 2,
      defaultRows: 5,
    });
  });
}

init.init = true;
