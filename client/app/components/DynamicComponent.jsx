import { isFunction, isString } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

const componentsRegistry = new Map();
const activeInstances = new Set();

export function registerComponent(alias, component) {
  if (isString(alias) && (alias !== '')) {
    componentsRegistry[alias] = isFunction(component) ? component : null;
    // Refresh active DynamicComponent instances which use this alias
    activeInstances.forEach((dynamicComponent) => {
      if (dynamicComponent.props.is === alias) {
        dynamicComponent.forceUpdate();
      }
    });
  }
}

export function unregisterComponent(alias) {
  registerComponent(alias, null);
}

export default class DynamicComponent extends React.Component {
  static propTypes = {
    is: PropTypes.string.isRequired,
    children: PropTypes.oneOfType([
      PropTypes.node,
      PropTypes.arrayOf(PropTypes.node),
    ]),
  };

  static defaultProps = {
    children: null,
  };

  componentDidMount() {
    activeInstances.add(this);
  }

  componentWillUnmount() {
    activeInstances.delete(this);
  }

  render() {
    const { is, children, ...props } = this.props;
    const RealComponent = componentsRegistry.get(is);
    if (!RealComponent) {
      return null;
    }
    return <RealComponent {...props}>{children}</RealComponent>;
  }
}
