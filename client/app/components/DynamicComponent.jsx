import { isFunction, each } from "lodash";
import React, { useState, useEffect } from "react";

// Introduce new dynamic components here; use `null` for default representation (display children)
const dynamicComponents = {
  HomeExtra: null,
  BeaconConsent: null,
  BeaconConsentSetting: null,
  UsersListExtra: null,
  DataSourcesListExtra: null,
  CreateDashboardDialogExtra: null,
  HelpDrawerExtraContent: null,
};

// Overriding dynamic components is simple: just assign a value to one of the fields above, e.g.:
//
// import DynamicComponent from "@/components/DynamicComponent";
// DynamicComponent.HomeExtra = CustomHomeExtraComponent;

const updateListeners = new Set();

// Patch components registry: convert each entry to getter + setter
each(dynamicComponents, (Component, name, target) => {
  function DynamicComponent({ children, ...props }) {
    // use state to force update component when underlying component has changed
    const [RealComponent, setRealComponent] = useState(() => Component);

    // listen for changes and re-render when needed
    useEffect(() => {
      function update(changedComponentName) {
        if (changedComponentName === name) {
          setRealComponent(() => Component);
        }
      }

      updateListeners.add(update);
      return () => {
        updateListeners.delete(update);
      };
    }, []);

    return RealComponent ? <RealComponent {...props}>{children}</RealComponent> : children;
  }

  DynamicComponent.defaultProps = {
    children: null,
  };

  DynamicComponent.displayName = `DynamicComponent<${name}>`;

  Object.defineProperty(target, name, {
    configurable: false,
    enumerable: true,
    get: () => DynamicComponent,
    set: newComponent => {
      Component = isFunction(newComponent) ? newComponent : null;
      updateListeners.forEach(fn => fn(name)); // notify mounted components that underlying component has changed
    },
  });
});

// prevent it from adding components not defined explicitly above ^
Object.freeze(dynamicComponents);

export default dynamicComponents;
