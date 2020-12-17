import React, { useCallback } from "react";
import HelpTrigger from "@/components/HelpTrigger";
import DynamicComponent from "@/components/DynamicComponent";
import { clientConfig } from "@/services/auth";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";
import PasswordLoginSettings from "./PasswordLoginSettings";
import GoogleLoginSettings from "./GoogleLoginSettings";
import SAMLSettings from "./SAMLSettings";
export default function AuthSettings(props: any) {
    const { values, onChange } = props;
    const handleChange = useCallback(changes => {
        const allSettings = { ...values, ...changes };
        const allAuthMethodsDisabled = !(clientConfig as any).googleLoginEnabled && !(clientConfig as any).ldapLoginEnabled && !allSettings.auth_saml_enabled;
        if (allAuthMethodsDisabled) {
            changes = { ...changes, auth_password_login_enabled: true };
        }
        onChange(changes);
    }, [values, onChange]);
    return (<DynamicComponent name="OrganizationSettings.AuthSettings" {...props}>
      <h3 className="m-t-0">
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
        Authentication <HelpTrigger type="AUTHENTICATION_OPTIONS"/>
      </h3>
      <hr />
      <PasswordLoginSettings {...props} onChange={handleChange}/>
      <GoogleLoginSettings {...props} onChange={handleChange}/>
      <SAMLSettings {...props} onChange={handleChange}/>
    </DynamicComponent>);
}
AuthSettings.propTypes = SettingsEditorPropTypes;
AuthSettings.defaultProps = SettingsEditorDefaultProps;
