import React, { useMemo } from "react";
import AntSwitch from "antd/lib/switch";
import Typography from "antd/lib/typography";

import "./Switch.less";

type OwnProps = {
  id?: string;
  disabled?: boolean;
  children?: React.ReactNode;
};

type Props = OwnProps & React.ComponentProps<typeof AntSwitch>;

export default function Switch({ id, children = null, disabled = false, ...props }: Props) {
  const fallbackId = useMemo(() => `visualization-editor-control-${Math.random().toString(36).substr(2, 10)}`, []);
  const switchId = id || fallbackId;

  if (children) {
    return (
      <label htmlFor={switchId} className="switch-with-label">
        <AntSwitch {...({ id: switchId, disabled, ...props } as any)} />
        <Typography.Text className="switch-text" disabled={disabled}>
          {children}
        </Typography.Text>
      </label>
    );
  }

  return <AntSwitch {...props} />;
}
