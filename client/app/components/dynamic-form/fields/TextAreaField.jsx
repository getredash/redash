import React from "react";
import Input from "antd/lib/input";

export default function TextAreaField({ form, field, ...otherProps }) {
  return <Input.TextArea {...otherProps} />;
}
