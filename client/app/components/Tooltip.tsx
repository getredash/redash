import React from "react";
import AntTooltip, { TooltipProps } from "antd/lib/tooltip";
import { isNil } from "lodash";

export default function Tooltip({ title, ...restProps }: TooltipProps) {
  const liveTitle = !isNil(title) ? (
    <span role="status" aria-live="assertive" aria-relevant="additions">
      {title as React.ReactNode}
    </span>
  ) : null;

  return <AntTooltip trigger={["hover", "focus"]} title={liveTitle} {...restProps} />;
}
