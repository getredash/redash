import { toNumber } from 'lodash';
import { Parameter } from '.';

class NumberParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.setValue(parameter.value);
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeValue(value) {
    const normalizedValue = toNumber(value);
    return !isNaN(normalizedValue) ? normalizedValue : 0;
  }
}

export default NumberParameter;
