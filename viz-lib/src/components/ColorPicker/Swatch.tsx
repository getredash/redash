import { isString } from "lodash";
import React from "react";
import cx from "classnames";
import Tooltip from "antd/lib/tooltip";

import "./swatch.less";

type OwnProps = {
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  color?: string | null;
  size?: number;
};

type Props = OwnProps & React.HTMLAttributes<HTMLSpanElement>;

export default function Swatch({ className, color = "transparent", title, size = 12, style, ...props }: Props) {
  const result = (
    <span
      className={cx("color-swatch", className)}
      style={{ backgroundColor: color || "transparent", width: size, ...style }}
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
