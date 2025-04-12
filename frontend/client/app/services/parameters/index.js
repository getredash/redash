import Parameter from "./Parameter";
import TextParameter from "./TextParameter";
import NumberParameter from "./NumberParameter";
import EnumParameter from "./EnumParameter";
import QueryBasedDropdownParameter from "./QueryBasedDropdownParameter";
import DateParameter from "./DateParameter";
import DateRangeParameter from "./DateRangeParameter";
import TextPatternParameter from "./TextPatternParameter";

function createParameter(param, parentQueryId) {
  switch (param.type) {
    case "number":
      return new NumberParameter(param, parentQueryId);
    case "enum":
      return new EnumParameter(param, parentQueryId);
    case "query":
      return new QueryBasedDropdownParameter(param, parentQueryId);
    case "date":
    case "datetime-local":
    case "datetime-with-seconds":
      return new DateParameter(param, parentQueryId);
    case "date-range":
    case "datetime-range":
    case "datetime-range-with-seconds":
      return new DateRangeParameter(param, parentQueryId);
    case "text-pattern":
      return new TextPatternParameter({ ...param, type: "text-pattern" }, parentQueryId);
    default:
      return new TextParameter({ ...param, type: "text" }, parentQueryId);
  }
}

function cloneParameter(param) {
  return createParameter(param, param.parentQueryId);
}

export {
  Parameter,
  TextParameter,
  TextPatternParameter,
  NumberParameter,
  EnumParameter,
  QueryBasedDropdownParameter,
  DateParameter,
  DateRangeParameter,
  createParameter,
  cloneParameter,
};
