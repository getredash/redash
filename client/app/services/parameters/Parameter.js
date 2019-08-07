import { isNull, isObject, isFunction, has } from 'lodash';
import { TextParameter, NumberParameter } from '.';

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

  static create(param) {
    switch (param.type) {
      case 'text':
        return new TextParameter(param);
      case 'number':
        return new NumberParameter(param);
      default:
        return null;
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

  clone() {
    return Parameter.create(this);
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
}

export default Parameter;
