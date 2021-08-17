import React from "react";
import Input from "antd/lib/input";

export default function InputField({ form, field, ...otherProps }) {
  return <Input {...otherProps} />;
}
