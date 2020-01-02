import { isFunction } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import debug from "debug";
import Typography from "antd/lib/typography";
import Alert from "antd/lib/alert";

const logger = debug("redash:errors");

export const ErrorBoundaryContext = React.createContext({
  handleError: error => {
    throw error;
  },
});

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

  renderError(error) {
    if (isFunction(this.props.renderError)) {
      return this.props.renderError(error);
    }
    return (
      <Alert
        message="Something went wrong."
        description={
          <Typography.Text style={{ display: "block" }} ellipsis>
            {error.message}
          </Typography.Text>
        }
        type="error"
        showIcon
      />
    );
  }

  render() {
    if (this.state.error) {
      return this.renderError(this.state.error);
    }

    return <ErrorBoundaryContext.Provider value={this}>{this.props.children}</ErrorBoundaryContext.Provider>;
  }
}
