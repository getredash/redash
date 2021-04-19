import React from "react";
import { isNil } from "lodash";
import AntTooltip, { TooltipProps } from "antd/lib/tooltip";

export default function Tooltip({ title, ...restProps }: TooltipProps) {
  const liveTitle = !isNil(title) ? (
    <span role="status" aria-live="assertive" aria-relevant="additions">
      {title}
    </span>
  ) : null;

  return <AntTooltip trigger={["hover", "focus"]} title={liveTitle} {...restProps} />;
}
