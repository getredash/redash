import React from "react";
import AntTooltip, { TooltipProps } from "antd/lib/tooltip";

export default function Tooltip({ title, ...restProps }: TooltipProps) {
  const liveTitle = (
    <span role="status" aria-live="assertive" aria-relevant="additions">
      {title}
    </span>
  );

  return <AntTooltip trigger={["hover", "focus"]} title={liveTitle} {...restProps} />;
}
