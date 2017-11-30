import { find, filter } from 'underscore';
import template from './dynamic-table.html';
import './dynamic-table.less';

function sortRows(rows, orderBy) {
  if (orderBy.length === 0) {
    return rows;
  }
  // Create a copy of array before sorting, because .sort() will modify original array
  return [].concat(rows).sort((a, b) => {
    let va;
    let vb;
    for (let i = 0; i < orderBy.length; i += 1) {
      va = a[orderBy[i].name];
      vb = b[orderBy[i].name];
      if (va < vb) {
        // if a < b - we should return -1, but take in account direction
        return orderBy[i].direction * -1;
      }
      if (va > vb) {
        // if a > b - we should return 1, but take in account direction
        return orderBy[i].direction * 1;
      }
    }
    return 0;
  });
}

function getRowsForPage(rows, page, itemsPerPage) {
  const first = (page - 1) * itemsPerPage;
  const last = first + itemsPerPage;
  return rows.slice(first, last);
}

function DynamicTable($sanitize) {
  'ngInject';

  this.itemsPerPage = 15;
  this.currentPage = 1;

  this.sortedRows = [];
  this.rowsToDisplay = [];
  this.orderBy = [];

  this.onColumnHeaderClick = (column) => {
    const orderBy = find(this.orderBy, item => item.name === column.name);
    if (orderBy) {
      // ASC -> DESC -> off
      if (orderBy.direction === 1) {
        orderBy.direction = -1;
      } else {
        this.orderBy = filter(this.orderBy, item => item.name !== column.name);
      }
    } else {
      this.orderBy.push({
        name: column.name,
        direction: 1,
      });
    }

    this.sortedRows = sortRows(this.rows, this.orderBy);
    this.rowsToDisplay = getRowsForPage(this.sortedRows, this.currentPage, this.itemsPerPage);
  };

  this.onPageChanged = () => {
    this.rowsToDisplay = getRowsForPage(this.sortedRows, this.currentPage, this.itemsPerPage);
  };

  this.$onChanges = (changes) => {
    if (changes.columns) {
      this.columns = changes.columns.currentValue;
      this.orderBy = [];
    }

    if (changes.rows) {
      this.rows = changes.rows.currentValue;
      this.currentPage = 1;
    }

    this.sortedRows = sortRows(this.rows, this.orderBy);
    this.rowsToDisplay = getRowsForPage(this.sortedRows, this.currentPage, this.itemsPerPage);
  };

  this.sanitize = value => $sanitize(value);

  this.sortIcon = (column) => {
    const orderBy = find(this.orderBy, item => item.name === column.name);
    if (orderBy) {
      return orderBy.direction > 0 ? 'down' : 'up';
    }
    return null;
  };
}

export default function init(ngModule) {
  ngModule.component('dynamicTable', {
    template,
    controller: DynamicTable,
    bindings: {
      rows: '<',
      columns: '<',
    },
  });
}
