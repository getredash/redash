import numberFormat from 'underscore.string/numberFormat';
import * as _ from 'underscore';

import counterTemplate from './counter.html';
import counterEditorTemplate from './counter-editor.html';

function getRowNumber(index, size) {
  if (index >= 0) {
    return index - 1;
  }

  if (Math.abs(index) > size) {
    index %= size;
  }

  return size + index;
}

function CounterRenderer() {
  return {
    restrict: 'E',
    template: counterTemplate,
    link($scope, $element) {
      $scope.fontSize = '1em';

      const rootNode = $element[0].querySelector('counter');
      // This is collection (not array), and will be updated by browser
      const rulers = rootNode.querySelectorAll('.ruler');
      let lastWidth = null;
      $scope.handleResize = () => {
        const rootWidth = Math.floor(rootNode.offsetWidth) - 30; // scrollbar
        if (rootWidth !== lastWidth) {
          lastWidth = rootWidth;
          const maxRuler = _.chain(rulers)
            .map(ruler => ({
              width: Math.floor(ruler.offsetWidth),
              fontSize: parseFloat(window.getComputedStyle(ruler).fontSize),
            }))
            .sortBy('width')
            .last()
            .value();

          const fontSize = Math.floor(rootWidth / maxRuler.width * maxRuler.fontSize);
          $scope.fontSize = fontSize + 'px';
        }
      };

      const refreshData = () => {
        const queryData = $scope.queryResult.getData();
        if (queryData) {
          const rowNumber = getRowNumber($scope.visualization.options.rowNumber, queryData.length);
          const targetRowNumber =
            getRowNumber($scope.visualization.options.targetRowNumber, queryData.length);
          const counterColName = $scope.visualization.options.counterColName;
          const targetColName = $scope.visualization.options.targetColName;

          if ($scope.visualization.options.countRow) {
            $scope.counterValue = queryData.length;
          } else if (counterColName) {
            $scope.counterValue = queryData[rowNumber][counterColName];
          }
          if (targetColName) {
            $scope.targetValue = queryData[targetRowNumber][targetColName];

            if ($scope.targetValue) {
              $scope.delta = $scope.counterValue - $scope.targetValue;
              $scope.trendPositive = $scope.delta >= 0;
            }
          } else {
            $scope.targetValue = null;
          }

          $scope.isNumber = _.isNumber($scope.counterValue);
          if ($scope.isNumber) {
            $scope.stringPrefix = $scope.visualization.options.stringPrefix;
            $scope.stringSuffix = $scope.visualization.options.stringSuffix;

            const stringDecimal = $scope.visualization.options.stringDecimal;
            const stringDecChar = $scope.visualization.options.stringDecChar;
            const stringThouSep = $scope.visualization.options.stringThouSep;
            if (stringDecimal || stringDecChar || stringThouSep) {
              $scope.counterValue = numberFormat(
                $scope.counterValue,
                stringDecimal,
                stringDecChar,
                stringThouSep,
              );
              $scope.isNumber = false;
            }
          } else {
            $scope.stringPrefix = null;
            $scope.stringSuffix = null;
          }
        }
      };

      $scope.$watch('visualization.options', refreshData, true);
      $scope.$watch('queryResult && queryResult.getData()', refreshData);
    },
  };
}

function CounterEditor() {
  return {
    restrict: 'E',
    template: counterEditorTemplate,
    link(scope) {
      scope.currentTab = 'general';
      scope.changeTab = (tab) => {
        scope.currentTab = tab;
      };
      scope.isValueNumber = () => {
        const queryData = scope.queryResult.getData();
        if (queryData) {
          const rowNumber = getRowNumber(scope.visualization.options.rowNumber, queryData.length);
          const counterColName = scope.visualization.options.counterColName;

          if (scope.visualization.options.countRow) {
            scope.counterValue = queryData.length;
          } else if (counterColName) {
            scope.counterValue = queryData[rowNumber][counterColName];
          }
        }
        return _.isNumber(scope.counterValue);
      };
    },
  };
}


export default function init(ngModule) {
  ngModule.directive('counterEditor', CounterEditor);
  ngModule.directive('counterRenderer', CounterRenderer);

  ngModule.config((VisualizationProvider) => {
    const renderTemplate =
        '<counter-renderer ' +
        'options="visualization.options" query-result="queryResult">' +
        '</counter-renderer>';

    const editTemplate = '<counter-editor></counter-editor>';
    const defaultOptions = {
      counterColName: 'counter',
      rowNumber: 1,
      targetRowNumber: 1,
      stringDecimal: 0,
      stringDecChar: '.',
      stringThouSep: ',',
      defaultColumns: 2,
      defaultRows: -1, // auto-height
    };

    VisualizationProvider.registerVisualization({
      type: 'COUNTER',
      name: 'Counter',
      renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions,
    });
  });
}
