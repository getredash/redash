import React from "react";
import Input from "antd/lib/input";

// NOTE: After antd 4.19.x, Input is a function component using rc-input. If you need to get the DOM node, use a function ref like:
//   <Input ref={el => { /* el is the DOM node */ }} />
// If you want to show validation state, you can now use the `status` prop: <Input status="error" />
export default function InputField({ form, field, ...otherProps }) {
  return <Input {...otherProps} />;
}
