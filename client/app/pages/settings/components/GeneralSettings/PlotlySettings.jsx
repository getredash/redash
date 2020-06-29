import React from "react";
import Checkbox from "antd/lib/checkbox";
import Form from "antd/lib/form";
import DynamicComponent from "@/components/DynamicComponent";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";

export default function PlotlySettings(props) {
  const { values, onChange } = props;

  return (
    <DynamicComponent name="OrganizationSettings.PlotlySettings" {...props}>
      <Form.Item label="Chart Visualization">
        <Checkbox
          name="hide_plotly_mode_bar"
          checked={values.hide_plotly_mode_bar}
          onChange={e => onChange({ hide_plotly_mode_bar: e.target.checked })}>
          Hide Plotly mode bar
        </Checkbox>
      </Form.Item>
    </DynamicComponent>
  );
}

PlotlySettings.propTypes = SettingsEditorPropTypes;

PlotlySettings.defaultProps = SettingsEditorDefaultProps;
