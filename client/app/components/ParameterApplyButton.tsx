import React from "react";
import Button from "antd/lib/button";
import Badge from "antd/lib/badge";
import Tooltip from "antd/lib/tooltip";
import KeyboardShortcuts from "@/services/KeyboardShortcuts";

type Props = {
    onClick: (...args: any[]) => any;
    paramCount: number;
};

function ParameterApplyButton({ paramCount, onClick }: Props) {
  // show spinner when count is empty so the fade out is consistent
  const icon = !paramCount ? "spinner fa-pulse" : "check";

  return (
    <div className="parameter-apply-button" data-show={!!paramCount} data-test="ParameterApplyButton">
      <Badge count={paramCount}>
        <Tooltip title={paramCount ? `${KeyboardShortcuts.modKey} + Enter` : null}>
          <span>
            <Button onClick={onClick}>
              <i className={`fa fa-${icon}`} /> Apply Changes
            </Button>
          </span>
        </Tooltip>
      </Badge>
    </div>
  );
}

export default ParameterApplyButton;
