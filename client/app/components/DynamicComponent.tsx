import { isFunction, isString, isUndefined } from "lodash";
import React from "react";

const componentsRegistry = new Map();
const activeInstances = new Set();

export function registerComponent(name: any, component: any) {
  if (isString(name) && name !== "") {
    componentsRegistry.set(name, isFunction(component) ? component : null);
    // Refresh active DynamicComponent instances which use this component
    activeInstances.forEach(dynamicComponent => {
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      if (dynamicComponent.props.name === name) {
        // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
        dynamicComponent.forceUpdate();
      }
    });
  }
}

export function unregisterComponent(name: any) {
  registerComponent(name, null);
}

type Props = {
    name: string;
    fallback?: React.ReactNode;
};

export default class DynamicComponent extends React.Component<Props> {

  componentDidMount() {
    activeInstances.add(this);
  }

  componentWillUnmount() {
    activeInstances.delete(this);
  }

  render() {
    const { name, children, fallback, ...props } = this.props;
    const RealComponent = componentsRegistry.get(name);
    if (!RealComponent) {
      // return fallback if any, otherwise return children
      return isUndefined(fallback) ? children : fallback;
    }
    return <RealComponent {...props}>{children}</RealComponent>;
  }
}
