import numberFormat from 'underscore.string/numberFormat';
import { isNumber as isNum } from 'underscore';

import BasicImageShowTemplate from './basic-image-show.html';
import BasicImageShowEditorTemplate from './basic-image-show-editor.html';

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
    template: BasicImageShowTemplate,
    link($scope) {
      const refreshData = () => {
        const queryData = $scope.queryResult.getData();
        console.log('THE QUERY data', queryData)
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

          $scope.isNumber = isNum($scope.counterValue);
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
    template: BasicImageShowEditorTemplate,
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
        return isNum(scope.counterValue);
      };
    },
  };
}


export default function init(ngModule) {
  ngModule.directive('basicImageShowEditor', CounterEditor);
  ngModule.directive('basicImageShowRenderer', CounterRenderer);

  ngModule.config((VisualizationProvider) => {
    const renderTemplate =
        '<basic-image-show-renderer ' +
        'options="visualization.options" query-result="queryResult">' +
        '</basic-image-show-renderer>';

    const editTemplate = '<basic-image-show-editor></basic-image-show-editor>';
    const defaultOptions = {
      counterColName: 'basicImageShow',
      rowNumber: 1,
      targetRowNumber: 1,
      stringDecimal: 0,
      stringDecChar: '.',
      stringThouSep: ',',
    };

    VisualizationProvider.registerVisualization({
      type: 'BASICIMAGESHOW',
      name: 'Basic Image Show',
      renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions,
    });
  });
}
