import React, { useMemo } from "react";
import PropTypes from "prop-types";
import AntSwitch from "antd/lib/switch";
import Typography from "antd/lib/typography";

import "./Switch.less";

export default function Switch({ id, children, disabled, ...props }) {
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

Switch.propTypes = {
  id: PropTypes.string,
  disabled: PropTypes.bool,
  children: PropTypes.node,
};

Switch.defaultProps = {
  id: null,
  disabled: false,
  children: null,
};
