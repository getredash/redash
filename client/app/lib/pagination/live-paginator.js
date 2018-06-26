export default class LivePaginator {
  constructor(rowsFetcher, {
    page = 1,
    itemsPerPage = 20,
    orderByField,
    orderByReverse = false,
    params = {},
  } = {}) {
    this.page = page;
    this.itemsPerPage = itemsPerPage;
    this.orderByField = orderByField;
    this.orderByReverse = orderByReverse;
    this.params = params;
    this.rowsFetcher = rowsFetcher;
    this.fetch(this.page);
  }

  fetch(page) {
    this.rowsFetcher(
      page,
      this.itemsPerPage,
      this.orderByField,
      this.orderByReverse,
      this.params,
      this,
    );
  }

  setPage(page) {
    this.page = page;
    this.fetch(page);
  }

  getPageRows() {
    return this.rows;
  }

  updateRows(rows, totalCount = undefined) {
    this.rows = rows;
    if (this.rows) {
      this.totalCount = totalCount || rows.length;
    } else {
      this.totalCount = 0;
    }
  }

  orderBy(column) {
    if (column === this.orderByField) {
      this.orderByReverse = !this.orderByReverse;
    } else {
      this.orderByField = column;
      this.orderByReverse = false;
    }

    if (this.orderByField) {
      this.fetch(this.page);
    }
  }
}
