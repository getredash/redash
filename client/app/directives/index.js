import autofocus from './autofocus';
import compareTo from './compare-to';
import gridsterAutoHeight from './gridster-auto-height';
import title from './title';
import resizeEvent from './resize-event';
import resizableToggle from './resizable-toggle';

export default function init(ngModule) {
  autofocus(ngModule);
  compareTo(ngModule);
  gridsterAutoHeight(ngModule);
  title(ngModule);
  resizeEvent(ngModule);
  resizableToggle(ngModule);
}
