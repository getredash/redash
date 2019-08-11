import { isNull, isObject, isFunction, isUndefined, isEqual, has } from 'lodash';
import {
  TextParameter, NumberParameter, EnumParameter, QueryBasedDropdownParameter,
  DateParameter, DateRangeParameter,
} from '.';

class Parameter {
  constructor(parameter, parentQueryId) {
    this.title = parameter.title;
    this.name = parameter.name;
    this.type = parameter.type;
    this.global = parameter.global; // backward compatibility in Widget service
    this.parentQueryId = parentQueryId;

    // Used for meta-parameters (i.e. dashboard-level params)
    this.locals = [];

    // Used for URL serialization
    Object.defineProperty(this, 'urlPrefix', {
      configurable: true,
      enumerable: false, // don't save it
      writable: true,
      value: 'p_',
    });
  }

  static create(param, parentQueryId) {
    switch (param.type) {
      case 'number':
        return new NumberParameter(param, parentQueryId);
      case 'enum':
        return new EnumParameter(param, parentQueryId);
      case 'query':
        return new QueryBasedDropdownParameter(param, parentQueryId);
      case 'date':
      case 'datetime-local':
      case 'datetime-with-seconds':
        return new DateParameter(param, parentQueryId);
      case 'date-range':
      case 'datetime-range':
      case 'datetime-range-with-seconds':
        return new DateRangeParameter(param, parentQueryId);
      default:
        return new TextParameter({ ...param, type: 'text' }, parentQueryId);
    }
  }

  static getValue(param, extra = {}) {
    if (!isObject(param) || !isFunction(param.getValue)) {
      return null;
    }

    return param.getValue(extra);
  }

  static setValue(param, value) {
    if (!isObject(param) || !isFunction(param.setValue)) {
      return null;
    }

    return param.setValue(value);
  }

  get isEmpty() {
    return isNull(this.getValue());
  }

  get hasPendingValue() {
    return this.pendingValue !== undefined && !isEqual(this.pendingValue, this.normalizedValue);
  }

  get normalizedValue() {
    return this.$$value;
  }

  // TODO: Remove this property when finally moved to React
  get ngModel() {
    return this.normalizedValue;
  }

  set ngModel(value) {
    this.setValue(value);
  }

  clone() {
    return Parameter.create(this, this.parentQueryId);
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeValue(value) {
    if (isUndefined(value)) {
      return null;
    }
    return value;
  }

  setValue(value) {
    const normalizedValue = this.normalizeValue(value);
    this.value = normalizedValue;
    this.$$value = normalizedValue;

    this.clearPendingValue();
    return this;
  }

  getValue() {
    return this.value;
  }

  setPendingValue(value) {
    this.pendingValue = this.normalizeValue(value);
  }

  applyPendingValue() {
    if (this.hasPendingValue) {
      this.setValue(this.pendingValue);
    }
  }

  clearPendingValue() {
    this.pendingValue = undefined;
  }

  toUrlParams() {
    const prefix = this.urlPrefix;
    return {
      [`${prefix}${this.name}`]: !this.isEmpty ? this.value : null,
      [`${prefix}${this.name}.start`]: null,
      [`${prefix}${this.name}.end`]: null,
    };
  }

  fromUrlParams(query) {
    const prefix = this.urlPrefix;
    const key = `${prefix}${this.name}`;
    if (has(query, key)) {
      this.setValue(query[key]);
    }
  }

  toQueryTextFragment() {
    return `{{ ${this.name} }}`;
  }
}

export default Parameter;
