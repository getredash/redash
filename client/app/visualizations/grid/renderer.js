import 'ag-grid/dist/styles/ag-grid.css';
import 'ag-grid/dist/styles/ag-theme-fresh.css';
import * as _ from 'underscore';
import { getColumnCleanName } from '@/services/query-result';

export default function gridRenderer() {
  return {
    restrict: 'E',
    scope: {
      queryResult: '=',
      itemsPerPage: '=',
    },
    template: `
      <div ag-grid="gridOptions" class="ag-theme-fresh"></div>
    `,
    replace: false,
    controller: ($scope) => {
      'ngInject';

      $scope.gridOptions = {
        columnDefs: [],
        rowData: [],
      };

      function update(columns, data) {
        debugger;
        $scope.gridOptions.api.setRowData(null);
        $scope.gridOptions.api.setColumnDefs(_.map(
          columns,
          col => ({
            headerName: getColumnCleanName(col.name),
            field: col.name,
          }),
        ));
        if (data !== null) {
          $scope.gridOptions.api.setRowData(data);
        }
      }

      $scope.$watch('queryResult && queryResult.getData()', (queryResult) => {
        if (!queryResult) {
          return;
        }
        update($scope.queryResult.getColumns(), $scope.queryResult.getData());
      });
    },
  };
}
