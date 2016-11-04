import template from './dynamic-table.html';

function DynamicTable() {
  this.itemsPerPage = this.count = 15;
  this.page = 1;
  this.rowsCount = 0;

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
