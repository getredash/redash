/* eslint-disable */
import uiGridTemplate from './uigrid.html';
import uiGridEditorTemplate from './uigrid-editor.html';
import { getColumnCleanName } from '../../services/query-result';

function UiGridRenderer() {
  return {
    restrict: 'E',
    template: uiGridTemplate,

    controller($scope, $filter, uiGridConstants) {
      if ($scope.queryResult.getData() != null) {
        const showColumnFooter = $scope.visualization.options.uiGridShowColumnFooter;
        const showGridFooter = $scope.visualization.options.uiGridShowGridFooter;
        const enableFiltering = $scope.visualization.options.uiGridEnableFiltering;
        const pinLeftColumn = $scope.visualization.options.uiGridPinLeftColumn;
        const pinRightColumn = $scope.visualization.options.uiGridPinRightColumn;



      const columns = $scope.queryResult.getColumns();
      const columnDefs = [];
      columns.forEach((col) => {
        let pinLeft = false;
          if(col.name == pinLeftColumn){
            pinLeft = true;
          }

        let pinRight = false;
          if(col.name == pinRightColumn){
            pinRight = true;
          }
          let minw = 50;
          if( $scope.visualization.options.uiGridMinColWidths && $scope.visualization.options.uiGridMinColWidths[col.name] > 0){
            minw = $scope.visualization.options.uiGridMinColWidths[col.name];
          }
        if(col.type == 'integer' || col.type == 'float'){
          columnDefs.push({field: getColumnCleanName(col.name), pinnedLeft: pinLeft, pinnedRight: pinRight, aggregationType: uiGridConstants.aggregationTypes.sum, minWidth: minw});
        } else {
          columnDefs.push({field: getColumnCleanName(col.name), pinnedLeft: pinLeft, pinnedRight: pinRight, groupable: true, minWidth: minw});
        }

      });
      $scope.gridOptions = {
        enableFiltering: enableFiltering,
        showGridFooter: showGridFooter,
        showColumnFooter: showColumnFooter,
        columnDefs: columnDefs,

        enablePinning: true,
        data: $scope.queryResult.getData(),
        //pinning?
      };
    }
    },

  };
}


function UiGridEditor() {


  return {
    restrict: 'E',
    template: uiGridEditorTemplate,

      link(scope) {
      scope.currentTab = 'general';

      scope.stackingOptions = {
        Disabled: null,
        Enabled: 'normal',
        Percent: 'percent',
      };

      scope.changeTab = (tab) => {
        scope.currentTab = tab;
      };
}
};
}


export default function (ngModule) {
  ngModule.directive('uigridEditor', UiGridEditor);
  ngModule.directive('uigridRenderer', UiGridRenderer);

  ngModule.config((VisualizationProvider) => {
    const renderTemplate =
        '<uigrid-renderer ' +
        'options="visualization.options" query-result="queryResult">' +
        '</uigrid-renderer>';
    const editTemplate = '<uigrid-editor></uigrid-editor>';
    const defaultOptions = {
      uiGridShowColumnFooter: true,
      uiGridShowGridFooter: true,
      uiGridEnableFiltering: true,
      uiGridMinColWidths: {},
    };

    VisualizationProvider.registerVisualization({
      type: 'UIGRID',
      name: 'UiGrid',
      renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions,
    });
  });
}
