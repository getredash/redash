import { isFunction } from "lodash";
import React, { useState, useEffect } from "react";

const dynamicComponents = {};

const updateListeners = new Set();

function createDynamicComponent(name) {
  function Component({ children, ...props }) {
    // use state to force update component when underlying component has changed
    const [RealComponent, setRealComponent] = useState(() => dynamicComponents[name]);

    // listen for changes and re-render when needed
    useEffect(() => {
      function update(changedComponentName) {
        if (changedComponentName === name) {
          setRealComponent(() => dynamicComponents[name]);
        }
      }

      updateListeners.add(update);
      return () => {
        updateListeners.delete(update);
      };
    }, []);

    return RealComponent ? <RealComponent {...props}>{children}</RealComponent> : children;
  }

  Component.defaultProps = {
    children: null,
  };

  Component.displayName = `DynamicComponent<${name}>`;

  return Component;
}

/**
 * @typedef ReactComponent
 * @type (React.Component|React.PureComponent|function)
 */

/**
 * To override dynamic components just assign a value to one of the fields, e.g.:
 *
 * ```javascript
 * import DynamicComponent from "@/components/DynamicComponent";
 * DynamicComponent.HomeExtra = CustomHomeExtraComponent;
 * ```
 *
 * Some predefined components list. Any arbitrary components may be registered as well
 *
 * @property {ReactComponent} HomeExtra
 * @property {ReactComponent} BeaconConsent
 * @property {ReactComponent} BeaconConsentSetting
 * @property {ReactComponent} UsersListExtra
 * @property {ReactComponent} DataSourcesListExtra
 * @property {ReactComponent} CreateDashboardDialogExtra
 * @property {ReactComponent} HelpDrawerExtraContent
 */
const DynamicComponent = new Proxy(
  {},
  {
    get(target, name) {
      target[name] = target[name] || createDynamicComponent(name);
      return target[name];
    },
    set(target, name, value) {
      dynamicComponents[name] = isFunction(value) ? value : null;
      updateListeners.forEach(fn => fn(name)); // notify mounted components that underlying component has changed
      return true;
    },
  }
);

export default DynamicComponent;
