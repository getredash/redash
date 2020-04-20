import React, { useMemo } from "react";
import PropTypes from "prop-types";
import AntSwitch from "antd/lib/switch";
import Typography from "antd/lib/typography";

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
      <label htmlFor={id} className="d-flex align-items-center">
        <AntSwitch id={id} disabled={disabled} {...props} />
        <Typography.Text className="m-l-10" disabled={disabled}>
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
