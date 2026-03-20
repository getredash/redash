const MockDate = require("mockdate");

const DEFAULT_TEST_DATE = new Date("2000-01-01T02:00:00.000");
const GET_COMPUTED_STYLE_PATCH_MARKER = "__redashPatchedGetComputedStyleForPseudoElements";
const MATCH_MEDIA_PATCH_MARKER = "__redashPatchedMatchMedia";

function getWindowObject(windowObject) {
  return windowObject || (typeof window !== "undefined" ? window : undefined);
}

function getGlobalObject(globalObject) {
  return globalObject || (typeof global !== "undefined" ? global : undefined);
}

function setMockDate(date = DEFAULT_TEST_DATE) {
  MockDate.set(date);
}

function installMessageChannelShim(globalObject, windowObject) {
  const resolvedGlobal = getGlobalObject(globalObject);
  const resolvedWindow = getWindowObject(windowObject);

  if (!resolvedGlobal || typeof resolvedGlobal.MessageChannel !== "undefined") {
    return;
  }

  class MessagePort {
    constructor() {
      this.onmessage = null;
      this.listeners = new Set();
      this.otherPort = null;
      this.closed = false;
    }

    postMessage(data) {
      if (this.closed || !this.otherPort || this.otherPort.closed) {
        return;
      }

      setTimeout(() => {
        if (this.closed || !this.otherPort || this.otherPort.closed) {
          return;
        }

        const event = { data, target: this.otherPort };
        this.otherPort.onmessage?.(event);
        this.otherPort.listeners.forEach(listener => listener(event));
      }, 0);
    }

    addEventListener(type, listener) {
      if (type === "message") {
        this.listeners.add(listener);
      }
    }

    removeEventListener(type, listener) {
      if (type === "message") {
        this.listeners.delete(listener);
      }
    }

    start() {}

    close() {
      this.closed = true;
      this.onmessage = null;
      this.listeners.clear();
    }
  }

  class MessageChannel {
    constructor() {
      this.port1 = new MessagePort();
      this.port2 = new MessagePort();
      this.port1.otherPort = this.port2;
      this.port2.otherPort = this.port1;
    }
  }

  resolvedGlobal.MessageChannel = MessageChannel;
  if (resolvedWindow) {
    resolvedWindow.MessageChannel = MessageChannel;
  }
}

function installGetComputedStylePseudoFallback(windowObject) {
  const resolvedWindow = getWindowObject(windowObject);

  if (!resolvedWindow || resolvedWindow[GET_COMPUTED_STYLE_PATCH_MARKER]) {
    return;
  }

  const originalGetComputedStyle = resolvedWindow.getComputedStyle;
  if (typeof originalGetComputedStyle !== "function") {
    return;
  }

  resolvedWindow.getComputedStyle = (elt, pseudoElt) => {
    if (pseudoElt) {
      return originalGetComputedStyle(elt);
    }

    return originalGetComputedStyle(elt, pseudoElt);
  };

  Object.defineProperty(resolvedWindow, GET_COMPUTED_STYLE_PATCH_MARKER, {
    value: true,
    configurable: true,
  });
}

function installResizeObserverShim(globalObject, windowObject) {
  const resolvedGlobal = getGlobalObject(globalObject);
  const resolvedWindow = getWindowObject(windowObject);

  if (!resolvedGlobal || typeof resolvedGlobal.ResizeObserver !== "undefined") {
    return;
  }

  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  resolvedGlobal.ResizeObserver = ResizeObserver;
  if (resolvedWindow) {
    resolvedWindow.ResizeObserver = ResizeObserver;
  }
}

function installReactDomFindDOMNodeShim() {
  const ReactDOM = require("react-dom");

  require("react-dom/client");

  const Internals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  if (Internals && Internals.findDOMNode && !ReactDOM.findDOMNode) {
    ReactDOM.findDOMNode = Internals.findDOMNode;
  }
}

function installMatchMediaMock(windowObject) {
  const resolvedWindow = getWindowObject(windowObject);

  if (!resolvedWindow || resolvedWindow[MATCH_MEDIA_PATCH_MARKER]) {
    return;
  }

  Object.defineProperty(resolvedWindow, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  Object.defineProperty(resolvedWindow, MATCH_MEDIA_PATCH_MARKER, {
    value: true,
    configurable: true,
  });
}

function installCommonJsdomShims({ date = DEFAULT_TEST_DATE, globalObject, windowObject } = {}) {
  setMockDate(date);
  installMessageChannelShim(globalObject, windowObject);
  installGetComputedStylePseudoFallback(windowObject);
}

module.exports = {
  DEFAULT_TEST_DATE,
  installCommonJsdomShims,
  installGetComputedStylePseudoFallback,
  installMatchMediaMock,
  installMessageChannelShim,
  installReactDomFindDOMNodeShim,
  installResizeObserverShim,
  setMockDate,
};
