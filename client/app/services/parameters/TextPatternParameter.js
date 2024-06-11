import { toString, isNull } from "lodash";
import Parameter from "./Parameter";

class TextPatternParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.regex = parameter.regex;
    this.setValue(parameter.value);
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeValue(value) {
    const normalizedValue = toString(value);
    if (isNull(normalizedValue)) {
      return null;
    }

    var re = new RegExp(this.regex);

    if (re !== null) {
      if (re.test(normalizedValue)) {
        return normalizedValue;
      }
    }
    return null;
  }
}

export default TextPatternParameter;
