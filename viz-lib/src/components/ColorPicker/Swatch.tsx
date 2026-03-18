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

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function Swatch({
  className: className = null,
  color: color = "transparent",
  title: title = null,
  size: size = 12,
  style: style = null,
  ...props
}: Props) {
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
