import React from "react";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";
import Form from "antd/lib/form";
import Input from "antd/lib/input";
import Select from "antd/lib/select";
import Skeleton from "antd/lib/skeleton";
import DynamicComponent from "@/components/DynamicComponent";
import { clientConfig } from "@/services/auth";

export default function FormatSettings(props) {
  const { values, onChange, loading } = props;

  return (
    <DynamicComponent name="OrganizationSettings.FormatSettings" {...props}>
      <Form.Item label="Date Format">
        {loading ? (
          <Skeleton.Input style={{ width: 300 }} active />
        ) : (
          <Select
            value={values.date_format}
            onChange={value => onChange({ date_format: value })}
            data-test="DateFormatSelect">
            {clientConfig.dateFormatList.map(dateFormat => (
              <Select.Option key={dateFormat} data-test={`DateFormatSelect:${dateFormat}`}>
                {dateFormat}
              </Select.Option>
            ))}
          </Select>
        )}
      </Form.Item>
      <Form.Item label="Time Format">
        {loading ? (
          <Skeleton.Input style={{ width: 300 }} active />
        ) : (
          <Select
            value={values.time_format}
            onChange={value => onChange({ time_format: value })}
            data-test="TimeFormatSelect">
            {clientConfig.timeFormatList.map(timeFormat => (
              <Select.Option key={timeFormat}>{timeFormat}</Select.Option>
            ))}
          </Select>
        )}
      </Form.Item>
      <Form.Item
        label="Thousands Separator"
        help="Character inserted at thousands positions in numbers (e.g. a space for 1 234 567).">
        {loading ? (
          <Skeleton.Input style={{ width: 300 }} active />
        ) : (
          <Input
            style={{ width: 300 }}
            maxLength={1}
            value={values.thousands_separator}
            onChange={e => onChange({ thousands_separator: e.target.value })}
            data-test="ThousandsSeparatorInput"
          />
        )}
      </Form.Item>
      <Form.Item
        label="Decimal Separator"
        help="Character used for the decimal point in numbers (e.g. a comma for 1234,56).">
        {loading ? (
          <Skeleton.Input style={{ width: 300 }} active />
        ) : (
          <Input
            style={{ width: 300 }}
            maxLength={1}
            value={values.decimal_separator}
            onChange={e => onChange({ decimal_separator: e.target.value })}
            data-test="DecimalSeparatorInput"
          />
        )}
      </Form.Item>
    </DynamicComponent>
  );
}

FormatSettings.propTypes = SettingsEditorPropTypes;

FormatSettings.defaultProps = SettingsEditorDefaultProps;
