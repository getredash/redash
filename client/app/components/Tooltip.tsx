import React from "react";
import AntTooltip, { TooltipProps } from "antd/lib/tooltip";

export default function Tooltip(props: TooltipProps) {
  return <AntTooltip trigger={["hover", "focus"]} {...props} />;
}
