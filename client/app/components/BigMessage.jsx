import React from "react";
import PropTypes from "prop-types";
import { useUniqueId } from "@/lib/hooks/useUniqueId";
import cx from "classnames";

function BigMessage({ message, icon, children, className }) {
  const messageId = useUniqueId("bm-message");
  return (
    <div
      className={"big-message p-15 text-center " + className}
      role="status"
      aria-live="assertive"
      aria-relevant="additions removals">
      <h3 className="m-t-0 m-b-0" aria-labelledby={messageId}>
        <i className={cx("fa", icon)} aria-hidden="true" />
      </h3>
      <br />
      <span id={messageId}>{message}</span>
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
