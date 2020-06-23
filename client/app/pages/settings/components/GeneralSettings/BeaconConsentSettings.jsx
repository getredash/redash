import React from "react";
import Form from "antd/lib/form";
import HelpTrigger from "@/components/HelpTrigger";
import Checkbox from "antd/lib/checkbox";
import DynamicComponent from "@/components/DynamicComponent";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";

export default function BeaconConsentSettings(props) {
  const { values, onChange } = props;

  return (
    <DynamicComponent name="OrganizationSettings.BeaconConsentSettings" {...props}>
      <Form.Item
        label={
          <>
            Anonymous Usage Data Sharing <HelpTrigger type="USAGE_DATA_SHARING" />
          </>
        }>
        <Checkbox
          name="beacon_consent"
          checked={values.beacon_consent}
          onChange={e => onChange({ beacon_consent: e.target.checked })}>
          Help Redash improve by automatically sending anonymous usage data
        </Checkbox>
      </Form.Item>
    </DynamicComponent>
  );
}

BeaconConsentSettings.propTypes = SettingsEditorPropTypes;

BeaconConsentSettings.defaultProps = SettingsEditorDefaultProps;
