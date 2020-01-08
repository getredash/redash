import { isFunction } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import debug from "debug";
import Alert from "antd/lib/alert";

const logger = debug("redash:errors");

export const ErrorBoundaryContext = React.createContext({
  handleError: error => {
    throw error;
  },
  reset: () => {},
});

export function ErrorMessage({ children }) {
  return <Alert message={children} type="error" showIcon />;
}

ErrorMessage.propTypes = {
  children: PropTypes.node,
};

ErrorMessage.defaultProps = {
  children: "Something went wrong.",
};

export default class ErrorBoundary extends React.Component {
  static propTypes = {
    children: PropTypes.node,
    renderError: PropTypes.func, // error => ReactNode
  };

  static defaultProps = {
    children: null,
    renderError: null,
  };

  state = { error: null };

  handleError = error => {
    this.setState(this.constructor.getDerivedStateFromError(error));
    this.componentDidCatch(error, null);
  };

  reset = () => {
    this.setState({ error: null });
  };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    logger(error, errorInfo);
  }

  render() {
    const { renderError, children } = this.props;
    const { error } = this.state;

    if (error) {
      if (isFunction(renderError)) {
        return renderError(error);
      }
      return <ErrorMessage />;
    }

    return <ErrorBoundaryContext.Provider value={this}>{children}</ErrorBoundaryContext.Provider>;
  }
}
