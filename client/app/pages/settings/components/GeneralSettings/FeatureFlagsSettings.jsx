import React from "react";
import Checkbox from "antd/lib/checkbox";
import Form from "antd/lib/form";
import Row from "antd/lib/row";
import DynamicComponent from "@/components/DynamicComponent";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";

export default function FeatureFlagsSettings(props) {
  const { values, onChange } = props;

  return (
    <DynamicComponent name="OrganizationSettings.FeatureFlagsSettings" {...props}>
      <Form.Item label="Feature Flags">
        <DynamicComponent name="OrganizationSettings.FeatureFlagsSettings.PermissionsControl" {...props}>
          <Row>
            <Checkbox
              name="feature_show_permissions_control"
              checked={values.feature_show_permissions_control}
              onChange={e => onChange({ feature_show_permissions_control: e.target.checked })}>
              Enable experimental multiple owners support
            </Checkbox>
          </Row>
        </DynamicComponent>
        <Row>
          <Checkbox
            name="send_email_on_failed_scheduled_queries"
            checked={values.send_email_on_failed_scheduled_queries}
            onChange={e => onChange({ send_email_on_failed_scheduled_queries: e.target.checked })}>
            Email query owners when scheduled queries fail
          </Checkbox>
        </Row>
        <Row>
          <Checkbox
            name="multi_byte_search_enabled"
            checked={values.multi_byte_search_enabled}
            onChange={e => onChange({ multi_byte_search_enabled: e.target.checked })}>
            Enable multi-byte (Chinese, Japanese, and Korean) search for query names and descriptions (slower)
          </Checkbox>
        </Row>
      </Form.Item>
    </DynamicComponent>
  );
}

FeatureFlagsSettings.propTypes = SettingsEditorPropTypes;

FeatureFlagsSettings.defaultProps = SettingsEditorDefaultProps;
