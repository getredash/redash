import { toNumber, isNull } from "lodash";
import { Parameter } from ".";

class NumberParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.setValue(parameter.value);
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeValue(value) {
    if (isNull(value)) {
      return null;
    }
    const normalizedValue = toNumber(value);
    return !isNaN(normalizedValue) ? normalizedValue : null;
  }
}

export default NumberParameter;
