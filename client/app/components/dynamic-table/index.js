import * as _ from 'underscore';
import 'ag-grid/dist/styles/ag-grid.css';
import 'ag-grid/dist/styles/ag-theme-material.css';
import template from './dynamic-table.html';
import './dynamic-table.less';

function DynamicTable($sanitize) {
  'ngInject';

  this.itemsPerPage = 10;
  this.page = 1;
  this.rowsCount = 0;

  this.gridOptions = {
    columnDefs: [],
    rowData: [],
    enableColResize: true,
    suppressFieldDotNotation: true,
    enableSorting: true,
    suppressRowClickSelection: true,
    suppressCellSelection: true,
    suppressClickEdit: true,
    pagination: true,
    suppressPaginationPanel: true,
    paginationPageSize: this.itemsPerPage,
    suppressScrollOnNewData: true,
    suppressDragLeaveHidesColumns: true,
    suppressFocusAfterRefresh: true,
    // domLayout: 'autoHeight',
  };

  const getCellStyle = (column) => {
    switch (column.type) {
      case 'integer':
      case 'float':
      case 'boolean':
      case 'date':
      case 'datetime':
        return {
          textAlign: 'right',
        };
      default:
        return {};
    }
  };

  const updateColumns = (columns) => {
    if (this.gridOptions.api) {
      this.gridOptions.api.setRowData(null);
      this.gridOptions.api.setColumnDefs(_.map(columns, col => ({
        headerName: col.title,
        field: col.name,
        cellStyle: getCellStyle(col),
        cellRenderer: params => $sanitize(params.value),
        valueFormatter: params => (col.formatFunction
          ? col.formatFunction(params.value, col.type)
          : params.value
        ),
      })));
      if (columns.length <= 4) {
        setTimeout(() => {
          this.gridOptions.api.sizeColumnsToFit();
        }, 50);
      }
    }
  };

  const updateData = (rows) => {
    if (this.gridOptions.api) {
      this.gridOptions.api.setRowData(rows);
    }
  };

  this.pageChanged = () => {
    if (this.gridOptions.api) {
      this.gridOptions.api.paginationGoToPage(this.page);
    }
  };

  this.$onChanges = (changes) => {
    if (changes.columns) {
      updateColumns(changes.columns.currentValue);
    }
    if (changes.rows) {
      updateData(changes.rows.currentValue);
    }
    this.rowsCount = this.rows.length;
    this.pageChanged();
  };
}

export default function init(ngModule) {
  ngModule.component('dynamicTable', {
    template,
    controller: DynamicTable,
    bindings: {
      rows: '<',
      columns: '<',
      count: '<',
    },
  });
}
