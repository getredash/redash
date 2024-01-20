import { isString } from "lodash";
import React from "react";
import cx from "classnames";
import Tooltip from "antd/lib/tooltip";

import "./swatch.less";

type Props = {
  className?: string;
  style?: any;
  title?: string;
  color?: string;
  size?: number;
};

export default function Swatch(props: Props) {
  const result = (
    <span
      className={cx("color-swatch", props.className)}
      style={{ backgroundColor: props.color, width: props.size, ...props.style }}
    />
  );

  if (isString(props.title) && props.title !== "") {
    return (
      <Tooltip title={props.title} mouseEnterDelay={0} mouseLeaveDelay={0}>
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
