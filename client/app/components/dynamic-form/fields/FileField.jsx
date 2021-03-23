import React from "react";
import Button from "antd/lib/button";
import Upload from "antd/lib/upload";
import UploadOutlinedIcon from "@ant-design/icons/UploadOutlined";

export default function FileField({ form, field, ...otherProps }) {
  const { name, initialValue } = field;
  const { getFieldValue } = form;
  const disabled = getFieldValue(name) !== undefined && getFieldValue(name) !== initialValue;

  return (
    <Upload {...otherProps} beforeUpload={() => false}>
      <Button disabled={disabled}>
        <UploadOutlinedIcon /> Click to upload
      </Button>
    </Upload>
  );
}
