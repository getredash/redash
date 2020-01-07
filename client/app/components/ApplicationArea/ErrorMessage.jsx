import React from "react";
import PropTypes from "prop-types";

export default function ErrorMessage({ error }) {
  return (
    <div className="fixed-container" data-test="ErrorMessage">
      <div className="container">
        <div className="col-md-8 col-md-push-2">
          <div className="error-state bg-white tiled">
            <div className="error-state__icon">
              <i className="zmdi zmdi-alert-circle-o" />
            </div>
            <div className="error-state__details">
              <h4>{error.message}</h4>
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
