import React from "react";
import SharedColumnsSettings from "../../shared/components/ColumnsSettings";
import { EditorPropTypes } from "@/visualizations/prop-types";

export default function ColumnsSettings({ options, onOptionsChange, data }: any) {
  return (
    <SharedColumnsSettings
      options={options}
      onOptionsChange={onOptionsChange}
      variant="table"
    />
  );
}

ColumnsSettings.propTypes = EditorPropTypes;
