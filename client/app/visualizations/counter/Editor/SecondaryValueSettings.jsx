import React, { useCallback } from "react";
import { EditorPropTypes } from "@/visualizations/prop-types";
import CounterValueOptions from "./CounterValueOptions";

export default function SecondaryValueSettings({ options, data, onOptionsChange }) {
  const onChange = useCallback(secondaryValue => onOptionsChange({ secondaryValue }), [onOptionsChange]);

  return (
    <React.Fragment>
      <CounterValueOptions options={options.secondaryValue} data={data} onChange={onChange} />
    </React.Fragment>
  );
}

SecondaryValueSettings.propTypes = EditorPropTypes;
