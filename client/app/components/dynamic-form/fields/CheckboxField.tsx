import React from "react";
import Checkbox from "antd/lib/checkbox";
import getFieldLabel from "../getFieldLabel";

export default function CheckboxField({ form, field, ...otherProps }) {
  const fieldLabel = getFieldLabel(field);
  return <Checkbox {...otherProps}>{fieldLabel}</Checkbox>;
}
