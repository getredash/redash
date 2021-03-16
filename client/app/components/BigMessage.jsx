import React from "react";
import PropTypes from "prop-types";

function BigMessage({ message, icon, children, className }) {
  return (
    <div className={"big-message p-15 text-center " + className} aria-live="assertive">
      {/* TODO: replace misuse of header */}
      <h3 className="m-t-0 m-b-0" aria-labelledby="bm-message">
        <i className={"fa " + icon} aria-hidden="true" />
      </h3>
      <br />
      <span id="bm-message">{message}</span>
      {children}
    </div>
  );
}

BigMessage.propTypes = {
  message: PropTypes.string,
  icon: PropTypes.string.isRequired,
  children: PropTypes.node,
  className: PropTypes.string,
};

BigMessage.defaultProps = {
  message: "",
  children: null,
  className: "tiled bg-white",
};

export default BigMessage;
