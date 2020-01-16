import React from "react";
import PropTypes from "prop-types";

export default function ErrorMessage({ error, showOriginalMessage }) {
  if (!error) {
    return null;
  }

  console.error(error);

  const message = showOriginalMessage
    ? error.message
    : "It seems like we encountered an error. Try refreshing this page or contact your administrator.";

  return (
    <div className="fixed-container" data-test="ErrorMessage">
      <div className="container">
        <div className="col-md-8 col-md-push-2">
          <div className="error-state bg-white tiled">
            <div className="error-state__icon">
              <i className="zmdi zmdi-alert-circle-o" />
            </div>
            <div className="error-state__details">
              <h4>{message}</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ErrorMessage.propTypes = {
  error: PropTypes.object.isRequired,
  showOriginalMessage: PropTypes.bool,
};

ErrorMessage.defaultProps = {
  showOriginalMessage: true,
};
