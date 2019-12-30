import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import Tooltip from "antd/lib/tooltip";
import KeyboardShortcuts, { humanReadableShortcut } from "@/services/KeyboardShortcuts";

export default function QueryViewExecuteButton({ shortcut, disabled, children, onClick }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const eventHandlers = useMemo(
    () => ({
      onMouseEnter: () => setTooltipVisible(true),
      onMouseLeave: () => setTooltipVisible(false),
    }),
    []
  );

  useEffect(() => {
    if (disabled) {
      setTooltipVisible(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (shortcut) {
      const shortcuts = {
        [shortcut]: onClick,
      };

      KeyboardShortcuts.bind(shortcuts);
      return () => {
        KeyboardShortcuts.unbind(shortcuts);
      };
    }
  }, [shortcut, onClick]);

  return (
    <Tooltip placement="top" title={humanReadableShortcut(shortcut, 1)} visible={tooltipVisible}>
      <span {...eventHandlers}>
        <Button
          data-test="ExecuteButton"
          type="primary"
          disabled={disabled}
          onClick={onClick}
          style={disabled ? { pointerEvents: "none" } : {}}>
          {children}
        </Button>
      </span>
    </Tooltip>
  );
}

QueryViewExecuteButton.propTypes = {
  shortcut: PropTypes.string,
  disabled: PropTypes.bool,
  children: PropTypes.node,
  onClick: PropTypes.func,
};

QueryViewExecuteButton.defaultProps = {
  shortcut: null,
  disabled: false,
  children: null,
  onClick: () => {},
};
