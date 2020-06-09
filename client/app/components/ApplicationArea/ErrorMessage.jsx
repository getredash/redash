import { isObject, get } from "lodash";
import React from "react";
import PropTypes from "prop-types";

function getErrorMessageByStatus(status, defaultMessage) {
  switch (status) {
    case 404:
      return "It seems like the page you're looking for cannot be found.";
    case 401:
    case 403:
      return "It seems like you don’t have permission to see this page.";
    default:
      return defaultMessage;
  }
}

export function getErrorMessage(
  error,
  defaultMessage = "It seems like we encountered an error. Try refreshing this page or contact your administrator."
) {
  if (isObject(error)) {
    // HTTP errors
    if (error.isAxiosError && isObject(error.response)) {
      const errorData = get(error, "response.data", {});

      // handle cases where the message is an object as { "message": msg } or { "error": msg }
      const errorMessage = errorData.message || errorData.error || defaultMessage;
      return getErrorMessageByStatus(error.response.status, errorMessage);
    }
    // Router errors
    if (error.status) {
      return getErrorMessageByStatus(error.status, defaultMessage);
    }
    // Other Error instances
    if (error.message) {
      return error.message;
    }
  }
  return defaultMessage;
}

export default function ErrorMessage({ error }) {
  if (!error) {
    return null;
  }

  console.error(error);

  return (
    <div className="fixed-container" data-test="ErrorMessage">
      <div className="container">
        <div className="col-md-8 col-md-push-2">
          <div className="error-state bg-white tiled">
            <div className="error-state__icon">
              <i className="zmdi zmdi-alert-circle-o" />
            </div>
            <div className="error-state__details">
              <h4>{getErrorMessage(error)}</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ErrorMessage.propTypes = {
  error: PropTypes.object.isRequired,
};
