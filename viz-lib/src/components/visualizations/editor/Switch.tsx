import React, { useMemo } from "react";
import AntSwitch from "antd/lib/switch";
import Typography from "antd/lib/typography";

import "./Switch.less";

type OwnProps = {
  id?: string;
  disabled?: boolean;
  children?: React.ReactNode;
};

export default function Switch({ id, children, disabled, ...props }: Props & React.ComponentProps<typeof AntSwitch>) {
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
        { /* @ts-ignore */  }
        <AntSwitch id={id} disabled={disabled} {...props} />
        <Typography.Text className="switch-text" disabled={disabled}>
          {children}
        </Typography.Text>
      </label>
    );
  }

  return <AntSwitch {...props} />;
}

type Props = OwnProps;
