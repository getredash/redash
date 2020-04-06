import React, { useMemo } from "react";
import PropTypes from "prop-types";
import cx from "classnames";

import { validateColor, getColorName } from "./utils";
import "./label.less";

export default function Label({ className, color, presetColors, ...props }) {
  const name = useMemo(() => getColorName(validateColor(color), presetColors), [color, presetColors]);

  return (
    <span className={cx("color-label", className)} {...props}>
      {name}
    </span>
  );
}

Label.propTypes = {
  className: PropTypes.string,
  color: PropTypes.string,
  presetColors: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string), // array of colors (no tooltips)
    PropTypes.objectOf(PropTypes.string), // color name => color value
  ]),
};

Label.defaultProps = {
  className: null,
  color: "#FFFFFF",
  presetColors: null,
};
