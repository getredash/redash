import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";

import "./funnel-bar.less";

export default function FunnelBar({ color, value, align, className, children }) {
  return (
    <div className={cx("funnel-bar", `funnel-bar-${align}`, className)}>
      <div className="funnel-bar-value" style={{ backgroundColor: color, width: value + "%" }} />
      <div className="funnel-bar-label">{children}</div>
    </div>
  );
}

FunnelBar.propTypes = {
  color: PropTypes.string,
  value: PropTypes.number,
  align: PropTypes.oneOf(["left", "center", "right"]),
  className: PropTypes.string,
  children: PropTypes.node,
};

FunnelBar.defaultProps = {
  color: "#dadada",
  value: 0.0,
  align: "left",
  className: null,
  children: null,
};
