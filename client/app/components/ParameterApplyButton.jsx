import React from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import Badge from "antd/lib/badge";
import Tooltip from "antd/lib/tooltip";
import KeyboardShortcuts from "@/services/KeyboardShortcuts";

function ParameterApplyButton({ paramCount, onClick }) {
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

ParameterApplyButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  paramCount: PropTypes.number.isRequired,
};

export default ParameterApplyButton;
