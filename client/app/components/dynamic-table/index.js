import { sortBy } from 'underscore';
import template from './dynamic-table.html';
import './dynamic-table.css';

function DynamicTable() {
  this.itemsPerPage = this.count = 15;
  this.page = 1;
  this.rowsCount = 0;
  this.orderByField = undefined;
  this.orderByReverse = false;

  this.pageChanged = () => {
    const first = this.count * (this.page - 1);
    const last = this.count * (this.page);

    this.rows = this.allRows.slice(first, last);
  };

  this.$onChanges = (changes) => {
    this.columns = changes.columns.currentValue;
    this.allRows = changes.rows.currentValue;
    this.rowsCount = this.allRows.length;

    this.pageChanged();
  };

  this.orderBy = (column) => {
    if (column === this.orderByField) {
      this.orderByReverse = !this.orderByReverse;
    } else {
      this.orderByField = column;
      this.orderByReverse = false;
    }

    if (this.orderByField) {
      this.allRows = sortBy(this.allRows, this.orderByField);
      if (this.orderByReverse) {
        this.allRows = this.allRows.reverse();
      }
      this.pageChanged();
    }
  };

  this.sortIcon = (column) => {
    if (column !== this.orderByField) {
      return null;
    }

    if (this.orderByReverse) {
      return 'desc';
    }

    return 'asc';
  };
}

export default function (ngModule) {
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
