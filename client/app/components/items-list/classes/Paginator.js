import { isUndefined } from "lodash";

export default class Paginator {
  page = 1;

  itemsPerPage = 20;

  totalCount = 0;

  get totalPages() {
    return Math.ceil(this.totalCount / this.itemsPerPage);
  }

  setPage(value, validate = true) {
    if (isUndefined(value)) {
      return;
    }
    value = parseInt(value, 10) || 1;
    if (validate) {
      this.page = value >= 1 && value <= this.totalPages ? value : 1;
    } else {
      this.page = value >= 1 ? value : 1;
    }
  }

  setItemsPerPage(value, validate = true) {
    if (isUndefined(value)) {
      return;
    }
    value = parseInt(value, 10) || 20;
    this.itemsPerPage = value >= 1 ? value : 1;
    if (validate) {
      this.setPage(this.page, validate);
    }
  }

  setTotalCount(value, validate = true) {
    if (isUndefined(value)) {
      return;
    }
    value = parseInt(value, 10) || 0;
    this.totalCount = value;
    if (validate) {
      this.setPage(this.page, validate);
    }
  }

  constructor({ page, itemsPerPage, totalCount, validate = true } = {}) {
    this.setItemsPerPage(itemsPerPage, validate);
    this.setTotalCount(totalCount, validate);
    this.setPage(page, validate);
  }

  getItemsForPage(items) {
    const first = this.itemsPerPage * (this.page - 1);
    const last = first + this.itemsPerPage;

    return items.slice(first, last);
  }
}
