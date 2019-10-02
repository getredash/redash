import { toString, isEmpty, trim } from 'lodash';
import { Parameter } from '.';

class TextParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.setValue(parameter.value);
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeValue(value) {
    const normalizedValue = toString(value);
    if (isEmpty(normalizedValue)) {
      return null;
    }
    return normalizedValue;
  }

  // eslint-disable-next-line class-methods-use-this
  isEmptyValue(value) {
    return !trim(value);
  }
}

export default TextParameter;
