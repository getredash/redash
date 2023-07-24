import React from "react";
import PropTypes from "prop-types";

export function ErrorMessageDetails(props) {
  return <h4>{props.message}</h4>;
}

ErrorMessageDetails.propTypes = {
  error: PropTypes.instanceOf(Error).isRequired,
  message: PropTypes.string.isRequired,
};
