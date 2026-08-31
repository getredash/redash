import Tooltip from "@/components/Tooltip";
import "@/redash-font/style.less";
import recordEvent from "@/services/recordEvent";
import Button from "antd/lib/button";
import PropTypes from "prop-types";
import React, { useCallback } from "react";

export default function AiQueryToggle({ available, enabled, onToggle }) {
  let tooltipMessage = "AI Query Enabled";
  let icon = "zmdi-portable-wifi";
  if (!enabled) {
    tooltipMessage = "AI Query Disabled";
    icon = "zmdi-portable-wifi-off";
  }

  if (!available) {
    tooltipMessage = "AI Query Not Available (Use Ctrl+Space to Trigger)";
    icon = "zmdi-portable-wifi-off";
  }

  const handleClick = useCallback(() => {
    recordEvent("toggle_ai_query", "screen", "query_editor", { state: !enabled });
    onToggle(!enabled);
  }, [enabled, onToggle]);

  return (
    <Tooltip placement="top" title={tooltipMessage}>
      <Button
        className="query-editor-controls-button m-r-5"
        disabled={!available}
        onClick={handleClick}
        aria-label={enabled ? "Disable AI Query" : "Enable AI Query"}
      >
        <i className={"zmdi " + icon} aria-hidden="true" />
      </Button>
    </Tooltip>
  );
}

AiQueryToggle.propTypes = {
  available: PropTypes.bool.isRequired,
  enabled: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};
