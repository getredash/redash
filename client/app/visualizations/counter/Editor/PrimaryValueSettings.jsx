import { omit } from "lodash";
import React from "react";
import { EditorPropTypes } from "@/visualizations/prop-types";
import CounterValueOptions from "./CounterValueOptions";
import counterTypes from "../counterTypes";

export default function PrimaryValueSettings({ options, data, onOptionsChange }) {
  const onChange = primaryValue => onOptionsChange({ primaryValue });

  return (
    <CounterValueOptions
      counterTypes={omit(counterTypes, ["unused"])}
      options={options.primaryValue}
      data={data}
      onChange={onChange}
    />
  );
}

PrimaryValueSettings.propTypes = EditorPropTypes;
