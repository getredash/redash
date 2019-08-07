import { toString, isEmpty } from 'lodash';
import { Parameter } from '.';

class TextParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.setValue(parameter.value);
  }

  getValue() {
    const value = toString(this.value);
    return !isEmpty(value) ? value : null;
  }
}

export default TextParameter;
