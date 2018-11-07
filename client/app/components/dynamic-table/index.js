import { find, filter, map, each } from 'lodash';
import template from './dynamic-table.html';
import './dynamic-table.less';

function filterRows(rows, searchTerm, columns) {
  if ((searchTerm === '') || (columns.length === 0) || (rows.length === 0)) {
    return rows;
  }
  searchTerm = searchTerm.toUpperCase();
  return filter(rows, (row) => {
    for (let i = 0; i < columns.length; i += 1) {
      const columnName = columns[i].name;
      const formatFunction = columns[i].formatFunction;
      if (row[columnName] !== undefined) {
        let value = formatFunction ? formatFunction(row[columnName]) : row[columnName];
        value = ('' + value).toUpperCase();
        if (value.indexOf(searchTerm) >= 0) {
          return true;
        }
      }
    }
    return false;
  });
}

function sortRows(rows, orderBy) {
  if ((orderBy.length === 0) || (rows.length === 0)) {
    return rows;
  }
  // Create a copy of array before sorting, because .sort() will modify original array
  return [].concat(rows).sort((a, b) => {
    let va;
    let vb;
    for (let i = 0; i < orderBy.length; i += 1) {
      va = a[orderBy[i].name];
      vb = b[orderBy[i].name];
      if (va == undefined || (va < vb)) {
        // if a < b - we should return -1, but take in account direction
        return orderBy[i].direction * -1;
      }
      if ((va > vb) || vb == undefined) {
        // if a > b - we should return 1, but take in account direction
        return orderBy[i].direction * 1;
      }
    }
    return 0;
  });
}

function validateItemsPerPage(value, defaultValue) {
  defaultValue = defaultValue || 25;
  value = parseInt(value, 10) || defaultValue;
  return value > 0 ? value : defaultValue;
}

// Optimized rendering
// Instead of using two nested `ng-repeat`s by rows and columns,
// we'll create a template for row (and update it when columns changed),
// compile it, and then use `ng-repeat` by rows and bind this template
// to each row's scope. The goal is to reduce amount of scopes and watchers
// from `count(rows) * count(cols)` to `count(rows)`. The major disadvantage
// is that cell markup should be specified here instead of template.
function createRowRenderTemplate(columns, $compile) {
  const rowTemplate = map(columns, (column, index) => {
    switch (column.displayAs) {
      case 'json':
        return `
          <dynamic-table-json-cell column="columns[${index}]" 
            value="row[columns[${index}].name]"></dynamic-table-json-cell>
        `;
      default:
        return `
          <dynamic-table-default-cell column="columns[${index}]" 
            row="row"></dynamic-table-default-cell>
        `;
    }
  }).join('');
  return $compile(rowTemplate);
}

function DynamicTable($compile) {
  'ngInject';

  this.itemsPerPage = validateItemsPerPage(this.itemsPerPage);
  this.currentPage = 1;
  this.searchTerm = '';

  this.columns = [];
  this.rows = [];
  this.preparedRows = [];
  this.rowsToDisplay = [];
  this.orderBy = [];
  this.orderByColumnsIndex = {};
  this.orderByColumnsDirection = {};

  this.searchColumns = [];

  const updateOrderByColumnsInfo = () => {
    this.orderByColumnsIndex = {};
    this.orderByColumnsDirection = {};
    each(this.orderBy, (column, index) => {
      this.orderByColumnsIndex[column.name] = index + 1;
      this.orderByColumnsDirection[column.name] = column.direction;
    });
  };

  const updateRowsToDisplay = (performFilterAndSort) => {
    if (performFilterAndSort) {
      this.preparedRows = sortRows(
        filterRows(this.rows, this.searchTerm, this.searchColumns),
        this.orderBy,
      );
    }
    const first = (this.currentPage - 1) * this.itemsPerPage;
    const last = first + this.itemsPerPage;
    this.rowsToDisplay = this.preparedRows.slice(first, last);
  };

  const setColumns = (columns) => {
    // 1. reset sorting
    // 2. reset current page
    // 3. reset search
    // 4. get columns for search
    // 5. update row rendering template
    // 6. prepare rows

    this.columns = columns;
    updateOrderByColumnsInfo();
    this.orderBy = [];
    this.currentPage = 1;
    this.searchTerm = '';
    this.searchColumns = filter(this.columns, 'allowSearch');
    this.renderSingleRow = createRowRenderTemplate(this.columns, $compile);
    updateRowsToDisplay(true);
  };

  const setRows = (rows) => {
    // 1. reset current page
    // 2. prepare rows

    this.rows = rows;
    this.currentPage = 1;
    updateRowsToDisplay(true);
  };

  this.renderSingleRow = null;

  this.onColumnHeaderClick = ($event, column) => {
    const orderBy = find(this.orderBy, item => item.name === column.name);
    if (orderBy) {
      // ASC -> DESC -> off
      if (orderBy.direction === 1) {
        orderBy.direction = -1;
        if (!$event.shiftKey) {
          this.orderBy = [orderBy];
        }
      } else {
        if ($event.shiftKey) {
          this.orderBy = filter(this.orderBy, item => item.name !== column.name);
        } else {
          this.orderBy = [];
        }
      }
    } else {
      if (!$event.shiftKey) {
        this.orderBy = [];
      }
      this.orderBy.push({
        name: column.name,
        direction: 1,
      });
    }
    updateOrderByColumnsInfo();
    updateRowsToDisplay(true);


    // Remove text selection - may occur accidentally
    if ($event.shiftKey) {
      document.getSelection().removeAllRanges();
    }
  };

  this.onPageChanged = () => {
    updateRowsToDisplay(false);
  };

  this.onSearchTermChanged = () => {
    this.preparedRows = sortRows(
      filterRows(this.rows, this.searchTerm, this.searchColumns),
      this.orderBy,
    );
    this.currentPage = 1;
    updateRowsToDisplay(true);
  };

  this.$onChanges = (changes) => {
    if (changes.columns) {
      if (changes.rows) {
        // if rows also changed - temporarily set if to empty array - to avoid
        // filtering and sorting
        this.rows = [];
      }
      setColumns(changes.columns.currentValue);
    }

    if (changes.rows) {
      setRows(changes.rows.currentValue);
    }

    if (changes.itemsPerPage) {
      this.itemsPerPage = validateItemsPerPage(this.itemsPerPage);
      this.currentPage = 1;
      updateRowsToDisplay(false);
    }
  };
}

export default function init(ngModule) {
  ngModule.component('dynamicTable', {
    template,
    controller: DynamicTable,
    bindings: {
      rows: '<',
      columns: '<',
      itemsPerPage: '<',
    },
  });
}
