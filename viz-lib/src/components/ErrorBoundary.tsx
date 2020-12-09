import { isFunction } from "lodash";
import React from "react";
import debug from "debug";
import Alert from "antd/lib/alert";

const logger = debug("redash:errors");

export const ErrorBoundaryContext = React.createContext({
  handleError: (error: any) => {
    // Allow calling chain to roll up, and then throw the error in global context
    setTimeout(() => {
      throw error;
    });
  },
  reset: () => {},
});

type OwnErrorMessageProps = {
    children?: React.ReactNode;
};

type ErrorMessageProps = OwnErrorMessageProps & typeof ErrorMessage.defaultProps;

export function ErrorMessage({ children }: ErrorMessageProps) {
  return <Alert message={children} type="error" showIcon />;
}

ErrorMessage.defaultProps = {
  children: "Something went wrong.",
};

type OwnErrorBoundaryProps = {
    renderError?: (...args: any[]) => any;
};

type ErrorBoundaryState = any;

type ErrorBoundaryProps = OwnErrorBoundaryProps & typeof ErrorBoundary.defaultProps;

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {

  static defaultProps = {
    children: null,
    renderError: null,
  };

  state = { error: null };

  handleError = (error: any) => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'getDerivedStateFromError' does not exist... Remove this comment to see the full error message
    this.setState(this.constructor.getDerivedStateFromError(error));
    this.componentDidCatch(error, null);
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'handleException' does not exist on type ... Remove this comment to see the full error message
    if (isFunction(window.handleException)) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'handleException' does not exist on type ... Remove this comment to see the full error message
      window.handleException(error);
    }
  };

  reset = () => {
    this.setState({ error: null });
  };

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    logger(error, errorInfo);
  }

  render() {
    const { renderError, children } = this.props;
    const { error } = this.state;

    if (error) {
      if (isFunction(renderError)) {
        // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
        return renderError(error);
      }
      return <ErrorMessage />;
    }

    return <ErrorBoundaryContext.Provider value={this}>{children}</ErrorBoundaryContext.Provider>;
  }
}
