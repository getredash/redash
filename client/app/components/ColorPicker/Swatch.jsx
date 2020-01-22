import { isString } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import Tooltip from "antd/lib/tooltip";

import "./swatch.less";

export default function Swatch({ className, color, title, size, ...props }) {
  const result = (
    <span className={cx("color-swatch", className)} style={{ backgroundColor: color, width: size }} {...props} />
  );

  if (isString(title) && title !== "") {
    return (
      <Tooltip title={title} mouseEnterDelay={0} mouseLeaveDelay={0}>
        {result}
      </Tooltip>
    );
  }
  return result;
}

Swatch.propTypes = {
  className: PropTypes.string,
  title: PropTypes.string,
  color: PropTypes.string,
  size: PropTypes.number,
};

Swatch.defaultProps = {
  className: null,
  title: null,
  color: "transparent",
  size: 12,
};
