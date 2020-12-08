import { sortBy } from "lodash";

export default class Paginator {
  itemsPerPage: any;
  orderByField: any;
  orderByReverse: any;
  page: any;
  rows: any;
  totalCount: any;
  constructor(rows: any, { page = 1, itemsPerPage = 20, totalCount = undefined } = {}) {
    this.page = page;
    this.itemsPerPage = itemsPerPage;
    this.updateRows(rows, totalCount);
    this.orderByField = undefined;
    this.orderByReverse = false;
  }

  setPage(page: any) {
    this.page = page;
  }

  getPageRows() {
    const first = this.itemsPerPage * (this.page - 1);
    const last = this.itemsPerPage * this.page;

    return this.rows.slice(first, last);
  }

  updateRows(rows: any, totalCount = undefined) {
    this.rows = rows;
    if (this.rows) {
      this.totalCount = totalCount || rows.length;
    } else {
      this.totalCount = 0;
    }
  }

  orderBy(column: any) {
    if (column === this.orderByField) {
      this.orderByReverse = !this.orderByReverse;
    } else {
      this.orderByField = column;
      this.orderByReverse = false;
    }

    if (this.orderByField) {
      this.rows = sortBy(this.rows, this.orderByField);
      if (this.orderByReverse) {
        this.rows = this.rows.reverse();
      }
    }
  }
}
