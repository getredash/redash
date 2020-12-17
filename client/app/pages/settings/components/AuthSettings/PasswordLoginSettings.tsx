import React from "react";
import Alert from "antd/lib/alert";
import Form from "antd/lib/form";
import Checkbox from "antd/lib/checkbox";
import Tooltip from "antd/lib/tooltip";
import Skeleton from "antd/lib/skeleton";
import DynamicComponent from "@/components/DynamicComponent";
import { clientConfig } from "@/services/auth";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";
export default function PasswordLoginSettings(props: any) {
    const { settings, values, onChange, loading } = props;
    const isTheOnlyAuthMethod = !(clientConfig as any).googleLoginEnabled && !(clientConfig as any).ldapLoginEnabled && !values.auth_saml_enabled;
    return (<DynamicComponent name="OrganizationSettings.PasswordLoginSettings" {...props}>
      {!loading && !settings.auth_password_login_enabled && (<Alert message="Password based login is currently disabled and users will
            be able to login only with the enabled SSO options." type="warning" className="m-t-15 m-b-15"/>)}
      <Form.Item label="Password Login">
        {loading ? (<Skeleton title={{ width: 300 }} paragraph={false} active/>) : (<Checkbox checked={values.auth_password_login_enabled} disabled={isTheOnlyAuthMethod} onChange={e => onChange({ auth_password_login_enabled: e.target.checked })}>
            {/* @ts-expect-error ts-migrate(2747) FIXME: 'Tooltip' components don't accept text as child el... Remove this comment to see the full error message */}
            <Tooltip title={isTheOnlyAuthMethod ? "Password login can be disabled only if another login method is enabled." : null} placement="right">
              Password Login Enabled
            </Tooltip>
          </Checkbox>)}
      </Form.Item>
    </DynamicComponent>);
}
PasswordLoginSettings.propTypes = SettingsEditorPropTypes;
PasswordLoginSettings.defaultProps = SettingsEditorDefaultProps;
