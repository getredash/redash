import React, { useCallback } from "react";
import PropTypes from "prop-types";
import "@/redash-font/style.less";
import recordEvent from "@/services/recordEvent";
import { Checkbox } from "antd";

export default function AutoLimitCheckbox({ available, checked, onChange }) {
  const handleClick = useCallback(() => {
    recordEvent("checkbox_auto_limit", "screen", "query_editor", { state: !checked });
    onChange(!checked);
  }, [checked, onChange]);

  return (
    <Checkbox
      className="query-editor-controls-checkbox m-l-5"
      disabled={!available}
      onClick={handleClick}
      checked={available && checked}>
      <label style={{ fontSize: 9 }}>Limit 1000</label>
    </Checkbox>
  );
}

AutoLimitCheckbox.propTypes = {
  available: PropTypes.bool.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
