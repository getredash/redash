// React 19 compat shim for react-dom
// In React 19, createRoot/hydrateRoot are only exported from 'react-dom/client',
// not from 'react-dom'. Libraries like rc-util (used by antd) spread {...ReactDOM}
// and expect createRoot to be present. This shim re-exports everything from
// react-dom plus createRoot/hydrateRoot from react-dom/client.
//
// Webpack alias: 'react-dom$' -> this file, 'react-dom-real$' -> real react-dom
//
// IMPORTANT: createRoot/hydrateRoot use lazy getters to break a circular dependency:
// this shim -> react-dom/client -> react-dom/client impl -> react-dom (this shim)
// Eager import would cause createRoot to be undefined at module evaluation time.

const ReactDOM = require("react-dom-real");

const mod = Object.assign({}, ReactDOM);

Object.defineProperty(mod, "createRoot", {
  get() {
    return require("react-dom/client").createRoot;
  },
  enumerable: true,
  configurable: true,
});

Object.defineProperty(mod, "hydrateRoot", {
  get() {
    return require("react-dom/client").hydrateRoot;
  },
  enumerable: true,
  configurable: true,
});

module.exports = mod;
