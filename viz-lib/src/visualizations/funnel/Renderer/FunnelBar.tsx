import React from "react";
import cx from "classnames";

import "./funnel-bar.less";

type OwnProps = {
  color?: string;
  value?: number;
  align?: "left" | "center" | "right";
  className?: string;
  children?: React.ReactNode;
};

const funnelBarDefaultProps = {
  color: "#dadada",
  value: 0.0,
  align: "left",
  className: null,
  children: null,
};

type Props = OwnProps & typeof funnelBarDefaultProps;

export default function FunnelBar({ color, value, align, className, children }: Props) {
  return (
    <div className={cx("funnel-bar", `funnel-bar-${align}`, className)}>
      <div className="funnel-bar-value" style={{ backgroundColor: color, width: value + "%" }} />
      <div className="funnel-bar-label">{children}</div>
    </div>
  );
}

FunnelBar.defaultProps = funnelBarDefaultProps;
