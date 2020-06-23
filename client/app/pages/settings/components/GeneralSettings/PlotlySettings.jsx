import React from "react";
import Checkbox from "antd/lib/checkbox";
import Form from "antd/lib/form";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";

export default function PlotlySettings({ values, onChange }) {
  return (
    <React.Fragment>
      <Form.Item label="Chart Visualization">
        <Checkbox
          name="hide_plotly_mode_bar"
          checked={values.hide_plotly_mode_bar}
          onChange={e => onChange("hide_plotly_mode_bar", e.target.checked)}>
          Hide Plotly mode bar
        </Checkbox>
      </Form.Item>
    </React.Fragment>
  );
}

PlotlySettings.propTypes = SettingsEditorPropTypes;

PlotlySettings.defaultProps = SettingsEditorDefaultProps;
