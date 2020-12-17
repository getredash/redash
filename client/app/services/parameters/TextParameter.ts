import { toString, isEmpty } from "lodash";
import Parameter from "./Parameter";

class TextParameter extends Parameter {
  constructor(parameter: any, parentQueryId: any) {
    super(parameter, parentQueryId);
    this.setValue(parameter.value);
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeValue(value: any) {
    const normalizedValue = toString(value);
    if (isEmpty(normalizedValue)) {
      return null;
    }
    return normalizedValue;
  }
}

export default TextParameter;
