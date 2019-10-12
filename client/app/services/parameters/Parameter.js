import { isNull, isObject, isFunction, isUndefined, isEqual, has, omit, isArray, each } from 'lodash';
import {
  TextParameter, NumberParameter, EnumParameter, QueryBasedDropdownParameter,
  DateParameter, DateRangeParameter,
} from '.';

class Parameter {
  constructor(parameter, query) {
    this.title = parameter.title;
    this.name = parameter.name;
    this.type = parameter.type;
    this.global = parameter.global; // backward compatibility in Widget service
    this.query = query;

    // Used for meta-parameters (i.e. dashboard-level params)
    this.locals = [];

    // Used for URL serialization
    this.urlPrefix = 'p_';
  }

  static create(param, query) {
    switch (param.type) {
      case 'number':
        return new NumberParameter(param, query);
      case 'enum':
        return new EnumParameter(param, query);
      case 'query':
        return new QueryBasedDropdownParameter(param, query);
      case 'date':
      case 'datetime-local':
      case 'datetime-with-seconds':
        return new DateParameter(param, query);
      case 'date-range':
      case 'datetime-range':
      case 'datetime-range-with-seconds':
        return new DateRangeParameter(param, query);
      default:
        return new TextParameter({ ...param, type: 'text' }, query);
    }
  }

  static getExecutionValue(param, extra = {}) {
    if (!isObject(param) || !isFunction(param.getExecutionValue)) {
      return null;
    }

    return param.getExecutionValue(extra);
  }

  static setValue(param, value) {
    if (!isObject(param) || !isFunction(param.setValue)) {
      return null;
    }

    return param.setValue(value);
  }

  get isEmpty() {
    return this.isEmptyValue(this.value);
  }

  get hasPendingValue() {
    return this.pendingValue !== undefined && !isEqual(this.pendingValue, this.normalizedValue);
  }

  /** Get normalized value to be used in inputs */
  get normalizedValue() {
    return this.$$value;
  }

  get validationError() {
    let error;

    // text fragment validation
    const queryText = this.query.query;
    error = queryText && this.getInvalidTextFragmentError(queryText);
    if (error) {
      return error;
    }

    // invalid value validation
    const value = this.hasPendingValue ? this.pendingValue : this.value;
    error = this.getInvalidValueError(value);
    if (error) {
      return error;
    }

    // no value validation
    if (this.isEmptyValue(value)) {
      return 'Required field';
    }

    return null;
  }

  clone() {
    return Parameter.create(this, this.query);
  }

  isEmptyValue(value) {
    return isNull(this.normalizeValue(value));
  }

  // eslint-disable-next-line class-methods-use-this
  getInvalidValueError() {
    return null; // accepts any input by default
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeValue(value) {
    if (isUndefined(value)) {
      return null;
    }
    return value;
  }

  updateLocals() {
    if (isArray(this.locals)) {
      each(this.locals, (local) => {
        local.setValue(this.value);
      });
    }
  }

  setValue(value) {
    const normalizedValue = this.normalizeValue(value);
    this.value = normalizedValue;
    this.$$value = normalizedValue;

    this.updateLocals();
    this.clearPendingValue();
    return this;
  }

  /** Get execution value for a query */
  getExecutionValue() {
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

  /** Update URL with Parameter value */
  toUrlParams() {
    const prefix = this.urlPrefix;
    // `null` removes the parameter from the URL in case it exists
    return {
      [`${prefix}${this.name}`]: !this.isEmpty ? this.value : null,
    };
  }

  /** Set parameter value from the URL */
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

  // eslint-disable-next-line class-methods-use-this
  getInvalidTextFragmentError(queryText) {
    const regex = new RegExp(`{{\\s*${this.name}\\s*}}`);
    if (!regex.test(queryText)) {
      return `Could not find ${this.toQueryTextFragment()} in query`;
    }

    return null;
  }

  /** Get a saveable version of the Parameter by omitting unnecessary props */
  toSaveableObject() {
    return omit(this, ['$$value', 'urlPrefix', 'pendingValue', 'query']);
  }
}

export default Parameter;
