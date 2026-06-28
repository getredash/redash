import initTextColumn from "./text";
import initNumberColumn from "./number";
import initDateTimeColumn from "./datetime";
import initBooleanColumn from "./boolean";
import initLinkColumn from "./link";
import initImageColumn from "./image";
import initJsonColumn from "./json";

// this map should contain all possible values for `column.displayAs` property
export default {
  string: initTextColumn,
  number: initNumberColumn,
  datetime: initDateTimeColumn,
  boolean: initBooleanColumn,
  link: initLinkColumn,
  image: initImageColumn,
  json: initJsonColumn,
};
