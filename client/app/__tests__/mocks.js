import MockDate from "mockdate";
import ReactDOM from "react-dom";
import "react-dom/client";

const date = new Date("2000-01-01T02:00:00.000");

MockDate.set(date);

// Polyfill ReactDOM.findDOMNode for antd v4 (removed from react-dom 19 exports
// but still available internally when react-dom/client is loaded)
const Internals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
if (Internals && Internals.findDOMNode && !ReactDOM.findDOMNode) {
  ReactDOM.findDOMNode = Internals.findDOMNode;
}

// Suppress React 19 deprecation warnings from antd v4 accessing element.ref
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === "string" && args[0].includes("Accessing element.ref was removed in React 19")) return;
  originalConsoleError(...args);
};
