import {toNumber, trim} from 'lodash';

import {Parameter} from '.';

class NumberParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.setValue(parameter.value);
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeValue(value) {
    if (!trim(value)) {
      return null;
    }
    const normalizedValue = toNumber(value);
    return !isNaN(normalizedValue) ? normalizedValue : value;
  }
}

export default NumberParameter;
