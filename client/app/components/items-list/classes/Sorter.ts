import { isString, sortBy } from "lodash";

const ORDER_BY_REVERSE = "-";

export function compile(field: any, reverse: any) {
  if (!field) {
    return null;
  }
  return reverse ? ORDER_BY_REVERSE + field : field;
}

export function parse(compiled: any) {
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

  setField(value: any) {
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string | null' is not assignable to type 'nu... Remove this comment to see the full error message
    this.field = isString(value) && value !== "" ? value : null;
  }

  setReverse(value: any) {
    this.reverse = !!value; // cast to boolean
  }

  constructor({
    orderByField,
    orderByReverse
  }: any = {}, sortByIteratees = undefined) {
    this.setField(orderByField);
    this.setReverse(orderByReverse);
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'undefined' is not assignable to type 'null'.
    this.sortByIteratees = sortByIteratees;
  }

  toggleField(field: any) {
    if (!isString(field) || field === "") {
      return;
    }
    if (field === this.field) {
      this.reverse = !this.reverse;
    } else {
      // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'null'.
      this.field = field;
      this.reverse = false;
    }
  }

  sort(items: any) {
    if (this.field) {
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
      const customIteratee = this.sortByIteratees && this.sortByIteratees[this.field];
      // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
      items = sortBy(items, customIteratee ? [customIteratee] : this.field);
      if (this.reverse) {
        items.reverse();
      }
      return items;
    }
  }
}
