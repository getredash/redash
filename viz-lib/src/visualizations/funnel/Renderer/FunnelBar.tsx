import React from "react";
import cx from "classnames";

import "./funnel-bar.less";

type OwnProps = {
  color?: string;
  value?: number;
  align?: "left" | "center" | "right";
  className?: string | null;
  children?: React.ReactNode;
};

const funnelBarDefaultProps = {
  color: "#dadada",
  value: 0.0,
  align: "left",
  className: null,
  children: null,
};

type Props = OwnProps;

export default function FunnelBar({
  color: color = "#dadada",
  value: value = 0.0,
  align: align = "left",
  className: className = null,
  children: children = null,
}: Props) {
  return (
    <div className={cx("funnel-bar", `funnel-bar-${align}`, className)}>
      <div className="funnel-bar-value" style={{ backgroundColor: color, width: value + "%" }} />
      <div className="funnel-bar-label">{children}</div>
    </div>
  );
}
