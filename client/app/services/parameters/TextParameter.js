import { toString, isEmpty } from 'lodash';
import { Parameter } from '.';

class TextParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.setValue(parameter.value);
  }

  static normalizeValue(value) {
    const normalizedValue = toString(value);
    if (isEmpty(normalizedValue)) {
      return null;
    }
    return normalizedValue;
  }
}

export default TextParameter;
