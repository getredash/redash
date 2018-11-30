export default class LivePaginator {
  constructor(rowsFetcher, {
    page = 1, itemsPerPage = 20, orderByField, orderByReverse = false,
  } = {}) {
    this.page = page;
    this.itemsPerPage = itemsPerPage;
    this.orderByField = orderByField;
    this.orderByReverse = orderByReverse;
    this.rowsFetcher = rowsFetcher;
    this.fetchPage(page);
  }

  fetchPage(page, requested = false) {
    this.rowsFetcher(page, this.itemsPerPage, this.orderByField, this.orderByReverse, this, requested);
  }

  setPage(page, pageSize, pageOrder, pageOrderReverse) {
    if (pageOrder) {
      this.orderByField = pageOrder;
    }
    if (pageOrderReverse) {
      this.orderByReverse = pageOrderReverse;
    }
    if (pageSize) {
      this.itemsPerPage = pageSize;
    }
    this.page = page;
    this.fetchPage(page);
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
      this.fetchPage(this.page, true);
    }
  }
}
