import React, { useMemo } from "react";
import PropTypes from "prop-types";
import hoistNonReactStatics from "hoist-non-react-statics";
import * as Grid from "antd/lib/grid";
import Typography from "antd/lib/typography";

import "./control-label.less";

export function ControlLabel({ layout, label, labelProps, disabled, children }) {
  if (layout === "vertical" && label) {
    return (
      <div className="visualization-editor-control-label visualization-editor-control-label-vertical">
        <label {...labelProps}>
          <Typography.Text disabled={disabled}>{label}</Typography.Text>
        </label>
        {children}
      </div>
    );
  }

  if (layout === "horizontal" && label) {
    return (
      <Grid.Row
        className="visualization-editor-control-label visualization-editor-control-label-horizontal"
        type="flex"
        align="middle"
        gutter={15}>
        <Grid.Col span={12}>
          <label {...labelProps}>
            <Typography.Text disabled={disabled}>{label}</Typography.Text>
          </label>
        </Grid.Col>
        <Grid.Col span={12}>{children}</Grid.Col>
      </Grid.Row>
    );
  }

  return children;
}

ControlLabel.propTypes = {
  layout: PropTypes.oneOf(["vertical", "horizontal"]),
  label: PropTypes.node,
  labelProps: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  disabled: PropTypes.bool,
  children: PropTypes.node,
};

ControlLabel.defaultProps = {
  layout: "vertical",
  label: null,
  disabled: false,
  children: null,
};

export default function withControlLabel(WrappedControl) {
  // eslint-disable-next-line react/prop-types
  function ControlWrapper({ id, layout, label, labelProps, disabled, ...props }) {
    const fallbackId = useMemo(
      () =>
        `visualization-editor-control-${Math.random()
          .toString(36)
          .substr(2, 10)}`,
      []
    );
    labelProps = {
      ...labelProps,
      htmlFor: id || fallbackId,
    };

    return (
      <ControlLabel layout={layout} label={label} labelProps={labelProps} disabled={disabled}>
        <WrappedControl id={labelProps.htmlFor} disabled={disabled} {...props} />
      </ControlLabel>
    );
  }

  // Copy static methods from `WrappedComponent`
  hoistNonReactStatics(ControlWrapper, WrappedControl);

  return ControlWrapper;
}
