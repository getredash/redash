import React from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import Badge from "antd/lib/badge";
import Tooltip from "@/components/Tooltip";
import KeyboardShortcuts from "@/services/KeyboardShortcuts";

function ParameterApplyButton({ paramCount, onClick }) {
  // show spinner when count is empty so the fade out is consistent
  const icon = !paramCount ? (
    <span role="status" aria-live="polite" aria-relevant="additions removals">
      <i className="fa fa-spinner fa-pulse" aria-hidden="true" />
      <span className="sr-only">Loading...</span>
    </span>
  ) : (
    <i className="fa fa-check" aria-hidden="true" />
  );

  return (
    <div className="parameter-apply-button" data-show={!!paramCount} data-test="ParameterApplyButton">
      <Badge count={paramCount}>
        <Tooltip title={paramCount ? `${KeyboardShortcuts.modKey} + Enter` : null}>
          <span>
            <Button onClick={onClick}>{icon} Apply Changes</Button>
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
