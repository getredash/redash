import React from "react";
import Form from "antd/lib/form";
import Select from "antd/lib/select";
import Skeleton from "antd/lib/skeleton";
import DynamicComponent from "@/components/DynamicComponent";
import Link from "@/components/Link";
import { currentUser } from "@/services/auth";
import { THEME_OPTIONS } from "@/services/theme";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";

export default function ThemeSettings(props) {
  const { values, onChange, loading } = props;
  // The admin's own choice wins over the default, so changing the default would seem to do nothing for them
  const ownTheme = THEME_OPTIONS.find(({ value }) => value === currentUser.theme);

  return (
    <DynamicComponent name="OrganizationSettings.ThemeSettings" {...props}>
      <Form.Item
        label="Theme"
        help={
          <React.Fragment>
            The default colour theme, also used for public dashboards and embeds. Users can choose their own in their
            profile.
            {ownTheme && (
              <div data-test="DefaultThemeOverriddenNote">
                You see the {ownTheme.name} theme, chosen in <Link href="users/me">your profile</Link>.
              </div>
            )}
          </React.Fragment>
        }
      >
        {loading ? (
          <Skeleton.Input style={{ width: 300 }} active />
        ) : (
          <Select
            value={values.default_theme}
            options={THEME_OPTIONS.map(({ value, label }) => ({ value, label }))}
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
