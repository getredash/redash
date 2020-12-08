import { isString, sortBy } from "lodash";

const ORDER_BY_REVERSE = "-";

export function compile(field, reverse) {
  if (!field) {
    return null;
  }
  return reverse ? ORDER_BY_REVERSE + field : field;
}

export function parse(compiled) {
  compiled = isString(compiled) ? compiled : "";
  const reverse = compiled.startsWith(ORDER_BY_REVERSE);
  if (reverse) {
    compiled = compiled.substring(1);
  }
  const field = compiled !== "" ? compiled : null;
  return { field, reverse };
}

export default class Sorter {
  field = null;

  reverse = false;

  sortByIteratees = null;

  get compiled() {
    return compile(this.field, this.reverse);
  }

  set compiled(value) {
    const { field, reverse } = parse(value);
    this.field = field;
    this.reverse = reverse;
  }

  setField(value) {
    this.field = isString(value) && value !== "" ? value : null;
  }

  setReverse(value) {
    this.reverse = !!value; // cast to boolean
  }

  constructor({ orderByField, orderByReverse } = {}, sortByIteratees = undefined) {
    this.setField(orderByField);
    this.setReverse(orderByReverse);
    this.sortByIteratees = sortByIteratees;
  }

  toggleField(field) {
    if (!isString(field) || field === "") {
      return;
    }
    if (field === this.field) {
      this.reverse = !this.reverse;
    } else {
      this.field = field;
      this.reverse = false;
    }
  }

  sort(items) {
    if (this.field) {
      const customIteratee = this.sortByIteratees && this.sortByIteratees[this.field];
      items = sortBy(items, customIteratee ? [customIteratee] : this.field);
      if (this.reverse) {
        items.reverse();
      }
      return items;
    }
  }
}
