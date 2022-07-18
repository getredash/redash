import React, { useCallback } from "react";
import PropTypes from "prop-types";
import recordEvent from "@/services/recordEvent";
import Checkbox from "antd/lib/checkbox";
import Tooltip from "@/components/Tooltip";

export default function LongQueryCheckbox({ available, checked, onChange }) {
    const handleClick = useCallback(() => {
        recordEvent("checkbox_long_query", "screen", "query_editor", { state: !checked });
        onChange(!checked);
    }, [checked, onChange]);

    let tooltipMessage = null;
    if (!available) {
        tooltipMessage = "Long Query Queue not available.";
    } else {
        tooltipMessage = "Mark this query as a long query.";
    }

    return (
        <Tooltip placement="top" title={tooltipMessage}>
            <Checkbox
                className="query-editor-controls-checkbox"
                disabled={!available}
                onClick={handleClick}
                checked={available && checked}>
                Mark as a Long Query
            </Checkbox>
        </Tooltip>
    );
}

LongQueryCheckbox.propTypes = {
    available: PropTypes.bool,
    checked: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
};
