export default class LivePaginator {
  constructor(rowsFetcher, { page = 1, itemsPerPage = 20 } = {}) {
    this.page = page;
    this.itemsPerPage = itemsPerPage;
    this.rowsFetcher = rowsFetcher;
    this.rowsFetcher(this.page, this.itemsPerPage, this);
  }

  setPage(page) {
    this.page = page;
    this.rowsFetcher(page, this.itemsPerPage, this);
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
}

