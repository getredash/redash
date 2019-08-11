import { isNumber, toString } from 'lodash';
import numeral from 'numeral';
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
  tooltipFormat: '0,0.000', // TODO: Show in editor
};

// TODO: allow user to specify number format string instead of delimiters only
// It will allow to remove this function (move all that weird formatting logic to a migration
// that will set number format for all existing counter visualization)
function numberFormat(value, decimalPoints, decimalDelimiter, thousandsDelimiter) {
  // Temporarily update locale data (restore defaults after formatting)
  const locale = numeral.localeData();
  const savedDelimiters = locale.delimiters;

  // Mimic old behavior - AngularJS `number` filter defaults:
  // - `,` as thousands delimiter
  // - `.` as decimal delimiter
  // - three decimal points
  locale.delimiters = {
    thousands: ',',
    decimal: '.',
  };
  let formatString = '0,0.000';
  if (
    (Number.isFinite(decimalPoints) && (decimalPoints >= 0)) ||
    decimalDelimiter ||
    thousandsDelimiter
  ) {
    locale.delimiters = {
      thousands: thousandsDelimiter,
      decimal: decimalDelimiter || '.',
    };

    formatString = '0,0';
    if (decimalPoints > 0) {
      formatString += '.';
      while (decimalPoints > 0) {
        formatString += '0';
        decimalPoints -= 1;
      }
    }
  }
  const result = numeral(value).format(formatString);

  locale.delimiters = savedDelimiters;
  return result;
}

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

function formatValue(value, { stringPrefix, stringSuffix, stringDecimal, stringDecChar, stringThouSep }) {
  if (isNumber(value)) {
    value = numberFormat(value, stringDecimal, stringDecChar, stringThouSep);
    return toString(stringPrefix) + value + toString(stringSuffix);
  }
  return toString(value);
}

function formatTooltip(value, formatString) {
  if (isNumber(value)) {
    return numeral(value).format(formatString);
  }
  return toString(value);
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

        $scope.showTrend = false;
        if (targetColName) {
          $scope.targetValue = data[targetRowNumber][targetColName];

          if (Number.isFinite($scope.counterValue) && Number.isFinite($scope.targetValue)) {
            const delta = $scope.counterValue - $scope.targetValue;
            $scope.showTrend = true;
            $scope.trendPositive = delta >= 0;
          }
        } else {
          $scope.targetValue = null;
        }

        $scope.counterValueTooltip = formatTooltip($scope.counterValue, options.tooltipFormat);
        $scope.targetValueTooltip = formatTooltip($scope.targetValue, options.tooltipFormat);

        $scope.counterValue = formatValue($scope.counterValue, options);
        $scope.targetValue = formatValue($scope.targetValue, options);
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
