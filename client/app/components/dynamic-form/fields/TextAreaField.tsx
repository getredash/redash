import React from "react";
import Input from "antd/lib/input";

export default function TextAreaField({
  form,
  field,
  ...otherProps
}: any) {
  return <Input.TextArea {...otherProps} />;
}
