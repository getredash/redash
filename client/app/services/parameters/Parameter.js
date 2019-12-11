import { isNull, isObject, isFunction, isUndefined, isEqual, has, omit, isArray, each } from "lodash";
import {
  TextParameter,
  NumberParameter,
  EnumParameter,
  QueryBasedDropdownParameter,
  DateParameter,
  DateRangeParameter,
} from ".";

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
    this.urlPrefix = "p_";
  }

  static create(param, parentQueryId) {
    switch (param.type) {
      case "number":
        return new NumberParameter(param, parentQueryId);
      case "enum":
        return new EnumParameter(param, parentQueryId);
      case "query":
        return new QueryBasedDropdownParameter(param, parentQueryId);
      case "date":
      case "datetime-local":
      case "datetime-with-seconds":
        return new DateParameter(param, parentQueryId);
      case "date-range":
      case "datetime-range":
      case "datetime-range-with-seconds":
        return new DateRangeParameter(param, parentQueryId);
      default:
        return new TextParameter({ ...param, type: "text" }, parentQueryId);
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
    return isNull(this.normalizedValue);
  }

  get hasPendingValue() {
    return this.pendingValue !== undefined && !isEqual(this.pendingValue, this.normalizedValue);
  }

  /** Get normalized value to be used in inputs */
  get normalizedValue() {
    return this.$$value;
  }

  clone() {
    return Parameter.create(this, this.parentQueryId);
  }

  isEmptyValue(value) {
    return isNull(this.normalizeValue(value));
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
      each(this.locals, local => {
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

  /** Get a saveable version of the Parameter by omitting unnecessary props */
  toSaveableObject() {
    return omit(this, ["$$value", "urlPrefix", "pendingValue", "parentQueryId"]);
  }
}

export default Parameter;
