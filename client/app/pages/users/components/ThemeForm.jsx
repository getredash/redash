import React, { useState } from "react";
import PropTypes from "prop-types";
import Form from "antd/lib/form";
import Select from "antd/lib/select";
import DynamicComponent from "@/components/DynamicComponent";
import { UserProfile } from "@/components/proptypes";
import { clientConfig, currentUser } from "@/services/auth";
import notification from "@/services/notification";
import { applyTheme } from "@/services/theme";
import User from "@/services/user";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import { useUniqueId } from "@/lib/hooks/useUniqueId";
import { THEME_OPTIONS } from "@/pages/settings/components/GeneralSettings/ThemeSettings";

const ORGANIZATION_DEFAULT = "default";

export default function ThemeForm(props) {
  const { user, onChange } = props;

  const [saving, setSaving] = useState(false);
  const handleChange = useImmutableCallback(onChange);
  const selectId = useUniqueId("theme");

  const defaultLabel = (THEME_OPTIONS.find(({ value }) => value === clientConfig.defaultTheme) || THEME_OPTIONS[0])
    .label;
  const options = [{ value: ORGANIZATION_DEFAULT, label: `Organization default (${defaultLabel})` }, ...THEME_OPTIONS];

  const saveTheme = (value) => {
    const theme = value === ORGANIZATION_DEFAULT ? null : value;
    setSaving(true);
    User.save({ id: user.id, theme })
      .then(() => {
        if (user.id === currentUser.id) {
          currentUser.theme = theme;
          applyTheme({ userTheme: theme, defaultTheme: clientConfig.defaultTheme });
        }
        handleChange({ ...user, theme });
        notification.success("Saved.");
      })
      .catch(() => {
        notification.error("Failed saving the theme.");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <DynamicComponent name="UserProfile.ThemeForm" {...props}>
      <Form layout="vertical">
        <hr />
        <Form.Item label="Theme" htmlFor={selectId} className="m-b-0">
          <Select
            id={selectId}
            value={user.theme || ORGANIZATION_DEFAULT}
            options={options}
            onChange={saveTheme}
            loading={saving}
            disabled={saving}
            data-test="ThemeSelect"
          />
        </Form.Item>
      </Form>
    </DynamicComponent>
  );
}

ThemeForm.propTypes = {
  user: UserProfile.isRequired,
  onChange: PropTypes.func,
};

ThemeForm.defaultProps = {
  onChange: () => {},
};
