import { isString } from "lodash";
import React from "react";
import cx from "classnames";
import Tooltip from "antd/lib/tooltip";

import "./swatch.less";

type OwnProps = {
  className?: string;
  style?: any;
  title?: string;
  color?: string;
  size?: number;
};

const swatchDefaultProps = {
  className: null,
  style: null,
  title: null,
  color: "transparent",
  size: 12,
};

type Props = OwnProps;

export default function Swatch({ className, color, title, size, style, ...props }: Props) {
  const result = (
    <span
      className={cx("color-swatch", className)}
      style={{ backgroundColor: color, width: size, ...style }}
      {...props}
    />
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

Swatch.defaultProps = swatchDefaultProps;
