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

function BasicImageShowRenderer() {
  return {
    restrict: 'E',
    template: BasicImageShowTemplate,
    link($scope) {
      const refreshData = () => {
        const queryData = $scope.queryResult.getData();

        if (queryData) {
          const rowNumber = getRowNumber($scope.visualization.options.rowNumber, queryData.length);
          const counterColName = $scope.visualization.options.counterColName;
          const targetColName = $scope.visualization.options.targetColName;

          if (counterColName) {
            $scope.counterValue = queryData[rowNumber][counterColName];
          }
          if (targetColName) {
            $scope.targetValue = queryData[rowNumber][targetColName];

            if ($scope.targetValue) {
              $scope.delta = $scope.counterValue - $scope.targetValue;
              $scope.trendPositive = $scope.delta >= 0;
            }
          } else {
            $scope.targetValue = null;
          }
        }
      };

      $scope.$watch('visualization.options', refreshData, true);
      $scope.$watch('queryResult && queryResult.getData()', refreshData);
    },
  };
}

function BasicImageShowEditor() {
  return {
    restrict: 'E',
    template: BasicImageShowEditorTemplate,
    link(scope) {
      scope.currentTab = 'general';
      scope.changeTab = (tab) => {
        scope.currentTab = tab;
      };
    },
  };
}


export default function init(ngModule) {
  ngModule.directive('basicImageShowEditor', BasicImageShowEditor);
  ngModule.directive('basicImageShowRenderer', BasicImageShowRenderer);

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
