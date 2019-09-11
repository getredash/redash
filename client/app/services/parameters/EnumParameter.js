import { isArray, isEmpty, includes, intersection, get, map, join, has } from 'lodash';
import { Parameter } from '.';

class EnumParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.enumOptions = parameter.enumOptions;
    this.multiValuesOptions = parameter.multiValuesOptions;
    this.setValue(parameter.value);
  }

  normalizeValue(value) {
    if (isEmpty(this.enumOptions)) {
      return null;
    }

    const enumOptionsArray = this.enumOptions.split('\n') || [];
    if (this.multiValuesOptions) {
      if (!isArray(value)) {
        value = [value];
      }
      value = intersection(value, enumOptionsArray);
    } else if (!value || isArray(value) || !includes(enumOptionsArray, value)) {
      value = enumOptionsArray[0];
    }
    return value;
  }

  getExecutionValue(extra = {}) {
    const { joinListValues } = extra;
    if (joinListValues && isArray(this.value)) {
      const separator = get(this.multiValuesOptions, 'separator', ',');
      const prefix = get(this.multiValuesOptions, 'prefix', '');
      const suffix = get(this.multiValuesOptions, 'suffix', '');
      const parameterValues = map(this.value, v => `${prefix}${v}${suffix}`);
      return join(parameterValues, separator);
    }
    return this.value;
  }

  toUrlParams() {
    const prefix = this.urlPrefix;

    let urlParam = this.value;
    if (this.multiValuesOptions && isArray(this.value)) {
      urlParam = JSON.stringify(this.value);
    }

    return {
      [`${prefix}${this.name}`]: !this.isEmpty ? urlParam : null,
      [`${prefix}${this.name}.start`]: null,
      [`${prefix}${this.name}.end`]: null,
    };
  }

  fromUrlParams(query) {
    const prefix = this.urlPrefix;
    const key = `${prefix}${this.name}`;
    if (has(query, key)) {
      if (this.multiValuesOptions) {
        try {
          this.setValue(JSON.parse(query[key]));
        } catch (e) {
          this.setValue(query[key]);
        }
      } else {
        this.setValue(query[key]);
      }
    }
  }
}

export default EnumParameter;
