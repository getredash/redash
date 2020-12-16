import React from "react";
import AceEditorInput from "@/components/AceEditorInput";

export default function AceEditorField({ form, field, ...otherProps }) {
  return <AceEditorInput {...otherProps} />;
}
