export default class Paginator {
  constructor(rows, { page = 1, itemsPerPage = 20, totalCount = undefined } = {}) {
    this.page = page;
    this.itemsPerPage = itemsPerPage;
    this.updateRows(rows, totalCount);
  }

  setPage(page) {
    this.page = page;
  }

  getPageRows() {
    const first = this.itemsPerPage * (this.page - 1);
    const last = this.itemsPerPage * (this.page);

    return this.rows.slice(first, last);
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
