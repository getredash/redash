import React, { useCallback } from "react";
import PropTypes from "prop-types";
import "@/redash-font/style.less";
import recordEvent from "@/services/recordEvent";
import { Checkbox } from "antd";
import Tooltip from "antd/lib/tooltip";

export default function AutoLimitCheckbox({ available, checked, onChange }) {
  const handleClick = useCallback(() => {
    recordEvent("checkbox_auto_limit", "screen", "query_editor", { state: !checked });
    onChange(!checked);
  }, [checked, onChange]);

  let tooltipMessage = null;
  if (!available) {
    tooltipMessage = "Auto limiting is not available for this data source";
  }

  return (
    <Tooltip placement="top" title={tooltipMessage}>
      <Checkbox
        className="query-editor-controls-checkbox"
        disabled={!available}
        onClick={handleClick}
        checked={available && checked}>
        Limit 1000
      </Checkbox>
    </Tooltip>
  );
}

AutoLimitCheckbox.propTypes = {
  available: PropTypes.bool,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
