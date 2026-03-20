const {
  installCommonJsdomShims,
  installMatchMediaMock,
  installReactDomFindDOMNodeShim,
  installResizeObserverShim,
} = require("../../test-support/jest/jsdom-shims");

installCommonJsdomShims();
installResizeObserverShim();
installReactDomFindDOMNodeShim();
installMatchMediaMock();
