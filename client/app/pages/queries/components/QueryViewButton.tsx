import React, { useState, useMemo, useEffect } from "react";
import Button from "antd/lib/button";
import KeyboardShortcuts from "@/services/KeyboardShortcuts";
import { ButtonTooltip } from "@/components/queries/QueryEditor/QueryEditorControls";

type OwnProps = {
    className?: string;
    shortcut?: string;
    disabled?: boolean;
    children?: React.ReactNode;
    onClick?: (...args: any[]) => any;
};

type Props = OwnProps & typeof QueryViewButton.defaultProps;

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function QueryViewButton({ title, shortcut, disabled, children, onClick, ...props }: Props) {
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
    // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
    <ButtonTooltip title={title} shortcut={shortcut} visible={tooltipVisible}>
      <span {...eventHandlers}>
        <Button
          data-test="ExecuteButton"
          disabled={disabled}
          onClick={onClick}
          style={disabled ? { pointerEvents: "none" } : {}}
          {...props}>
          {children}
        </Button>
      </span>
    </ButtonTooltip>
  );
}

QueryViewButton.defaultProps = {
  className: null,
  shortcut: null,
  disabled: false,
  children: null,
  onClick: () => {},
};
