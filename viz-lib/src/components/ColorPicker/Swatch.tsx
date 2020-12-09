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

type Props = OwnProps & typeof Swatch.defaultProps;

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function Swatch({ className, color, title, size, style, ...props }: Props) {
  const result = (
    <span
      className={cx("color-swatch", className)}
      // @ts-expect-error ts-migrate(2698) FIXME: Spread types may only be created from object types... Remove this comment to see the full error message
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

Swatch.defaultProps = {
  className: null,
  style: null,
  title: null,
  color: "transparent",
  size: 12,
};
