import autofocus from "./autofocus";
import compareTo from "./compare-to";
import resizeEvent from "./resize-event";

export default function init(ngModule) {
  autofocus(ngModule);
  compareTo(ngModule);
  resizeEvent(ngModule);
}

init.init = true;
