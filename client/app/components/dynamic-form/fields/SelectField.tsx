import React from "react";
import Select from "antd/lib/select";

export default function SelectField({
  form,
  field,
  ...otherProps
}: any) {
  const { readOnly } = field;
  return (
    <Select
      {...otherProps}
      optionFilterProp="children"
      loading={field.loading || false}
      mode={field.mode}
      getPopupContainer={trigger => trigger.parentNode}>
      {field.options &&
        field.options.map((option: any) => <Select.Option key={`${option.value}`} value={option.value} disabled={readOnly}>
          {option.name || option.value}
        </Select.Option>)}
    </Select>
  );
}
