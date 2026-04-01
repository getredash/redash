import React from "react";
import AntTooltip from "antd/lib/tooltip";
import type { TooltipProps } from "antd/lib/tooltip";
import { isNil } from "lodash";

type LegacyTooltipProps = TooltipProps & {
  arrowPointAtCenter?: boolean;
  visible?: TooltipProps["open"];
  onVisibleChange?: TooltipProps["onOpenChange"];
};

export default function Tooltip({
  title,
  arrow,
  arrowPointAtCenter = false,
  visible,
  onVisibleChange,
  open = visible,
  onOpenChange = onVisibleChange,
  ...restProps
}: LegacyTooltipProps) {
  const liveTitle = !isNil(title) ? (
    <span role="status" aria-live="assertive" aria-relevant="additions">
      {typeof title === "function" ? title() : title}
    </span>
  ) : null;

  return (
    <AntTooltip
      trigger={["hover", "focus"]}
      title={liveTitle}
      arrow={arrowPointAtCenter ? { pointAtCenter: true } : arrow}
      open={open}
      onOpenChange={onOpenChange}
      {...restProps}
    />
  );
}
