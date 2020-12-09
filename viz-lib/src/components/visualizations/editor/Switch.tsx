import React, { useMemo } from "react";
import AntSwitch from "antd/lib/switch";
import Typography from "antd/lib/typography";

import "./Switch.less";

type OwnProps = {
    id?: string;
    disabled?: boolean;
    children?: React.ReactNode;
};

type Props = OwnProps & typeof Switch.defaultProps;

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function Switch({ id, children, disabled, ...props }: Props) {
  const fallbackId = useMemo(
    () =>
      `visualization-editor-control-${Math.random()
        .toString(36)
        .substr(2, 10)}`,
    []
  );
  id = id || fallbackId;

  if (children) {
    return (
      <label htmlFor={id} className="switch-with-label">
        <AntSwitch id={id} disabled={disabled} {...props} />
        <Typography.Text className="switch-text" disabled={disabled}>
          {children}
        </Typography.Text>
      </label>
    );
  }

  return <AntSwitch {...props} />;
}

Switch.defaultProps = {
  id: null,
  disabled: false,
  children: null,
};
