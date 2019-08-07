import { toNumber } from 'lodash';
import { Parameter } from '.';

class NumberParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.setValue(parameter.value);
  }

  getValue() {
    const value = toNumber(this.value);
    return !isNaN(value) ? value : null;
  }
}

export default NumberParameter;
