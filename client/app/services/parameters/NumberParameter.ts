import { toNumber, isNull } from "lodash";
import Parameter from "./Parameter";

class NumberParameter extends Parameter {
  constructor(parameter: any, parentQueryId: any) {
    super(parameter, parentQueryId);
    this.setValue(parameter.value);
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeValue(value: any) {
    if (isNull(value)) {
      return null;
    }
    const normalizedValue = toNumber(value);
    return !isNaN(normalizedValue) ? normalizedValue : null;
  }
}

export default NumberParameter;
