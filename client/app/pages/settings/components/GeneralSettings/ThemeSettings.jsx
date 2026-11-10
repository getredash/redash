import React from "react";
import Form from "antd/lib/form";
import Select from "antd/lib/select";
import Skeleton from "antd/lib/skeleton";
import DynamicComponent from "@/components/DynamicComponent";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";

export const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System (follows the operating system)" },
];

export default function ThemeSettings(props) {
  const { values, onChange, loading } = props;

  return (
    <DynamicComponent name="OrganizationSettings.ThemeSettings" {...props}>
      <Form.Item
        label="Theme"
        help="The default colour theme, also used for public dashboards and embeds. Users can choose their own in their profile."
      >
        {loading ? (
          <Skeleton.Input style={{ width: 300 }} active />
        ) : (
          <Select
            value={values.default_theme}
            options={THEME_OPTIONS}
            onChange={(value) => onChange({ default_theme: value })}
            data-test="DefaultThemeSelect"
          />
        )}
      </Form.Item>
    </DynamicComponent>
  );
}

ThemeSettings.propTypes = SettingsEditorPropTypes;

ThemeSettings.defaultProps = SettingsEditorDefaultProps;
