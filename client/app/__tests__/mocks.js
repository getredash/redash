import MockDate from "mockdate";

const date = new Date("2000-01-01T02:00:00.000");

MockDate.set(date);

// jsdom doesn't implement getComputedStyle with pseudo-elements.
// antd's rc-util/getScrollBarSize calls getComputedStyle(el, ':before'),
// which triggers jsdom's "Not implemented" error. Provide a working fallback.
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt, pseudoElt) => {
  if (pseudoElt) {
    return originalGetComputedStyle(elt);
  }
  return originalGetComputedStyle(elt, pseudoElt);
};
