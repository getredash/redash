import { toNumber, isNull, isUndefined } from 'lodash';
import { Parameter } from '.';

class NumberParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.setValue(parameter.value);
  }

  static normalizeValue(value) {
    if (isNull(value) || isUndefined(value)) {
      return null;
    }

    const normalizedValue = toNumber(value);
    return !isNaN(normalizedValue) ? normalizedValue : 0;
  }
}

export default NumberParameter;
