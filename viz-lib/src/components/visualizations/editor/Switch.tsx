import React, { useMemo } from "react";
import AntSwitch from "antd/lib/switch";
import Typography from "antd/lib/typography";

import "./Switch.less";

type OwnProps = {
  id?: string;
  disabled?: boolean;
  children?: React.ReactNode;
};

const switchDefaultProps = {
  id: null,
  disabled: false,
  children: null,
};

type Props = OwnProps;

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function Switch({
  id: id = null,
  children: children = null,
  disabled: disabled = false,
  ...props
}: Props) {
  const fallbackId = useMemo(() => `visualization-editor-control-${Math.random().toString(36).substr(2, 10)}`, []);
  id = id || fallbackId;

  if (children) {
    return (
      <label htmlFor={id} className="switch-with-label">
        <AntSwitch {...({ id, disabled, ...props } as any)} />
        <Typography.Text className="switch-text" disabled={disabled}>
          {children}
        </Typography.Text>
      </label>
    );
  }

  return <AntSwitch {...props} />;
}
