import React, { useMemo } from "react";
import cx from "classnames";
import hoistNonReactStatics from "hoist-non-react-statics";
import * as Grid from "antd/lib/grid";
import Typography from "antd/lib/typography";

import "./control-label.less";

type OwnProps = {
  layout?: "vertical" | "horizontal";
  label?: React.ReactNode;
  labelProps?: any;
  disabled?: boolean;
  children?: any;
};

const defaultProps = {
  layout: "vertical",
  label: null,
  disabled: false,
  children: null
};

type Props = OwnProps & typeof defaultProps;

export function ControlLabel({ layout, label, labelProps, disabled, children }: Props): JSX.Element {
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

ControlLabel.defaultProps = defaultProps;

export default function withControlLabel(WrappedControl: any) {
  // eslint-disable-next-line react/prop-types
  function ControlWrapper({ className, id, layout, label, labelProps, disabled, ...props }: any) {
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
        <WrappedControl
          className={cx("visualization-editor-input", className)}
          id={labelProps.htmlFor}
          disabled={disabled}
          {...props}
        />
      </ControlLabel>
    );
  }

  // Copy static methods from `WrappedComponent`
  hoistNonReactStatics(ControlWrapper, WrappedControl);

  return ControlWrapper;
}
