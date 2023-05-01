import React from "react";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";
import Checkbox from "antd/lib/checkbox";
import Form from "antd/lib/form";
import Skeleton from "antd/lib/skeleton";
import DynamicComponent from "@/components/DynamicComponent";

export default function WatermarkSettings(props) {
    const { values, onChange, loading } = props;
    return (
        <DynamicComponent name="OrganizationSettings.WatermarkSettings" {...props}>
            <Form.Item label="Watermark setting">
                {loading ? (
                    <Skeleton title={{ width: 300 }} paragraph={false} active />
                ) : (
                    <Checkbox
                        name="watermark_enabled"
                        checked={values.watermark_enabled}
                        onChange={e => onChange({ watermark_enabled: e.target.checked })}>
                        enabled watermark
                    </Checkbox>
                )}
            </Form.Item>
        </DynamicComponent>
    );
}


WatermarkSettings.propTypes = SettingsEditorPropTypes;

WatermarkSettings.defaultProps = SettingsEditorDefaultProps;