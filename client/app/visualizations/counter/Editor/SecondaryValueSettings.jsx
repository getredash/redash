import React from "react";
import { Section, Checkbox } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";
import CounterValueOptions from "./CounterValueOptions";
import counterTypes from "../counterTypes";

export default function SecondaryValueSettings({ options, data, onOptionsChange }) {
  const onChange = secondaryValue => onOptionsChange({ secondaryValue });

  const disabled = options.secondaryValue.type === "unused";

  return (
    <React.Fragment>
      <CounterValueOptions
        disabled={disabled}
        counterTypes={counterTypes}
        options={options.secondaryValue}
        data={data}
        onChange={onChange}
      />
      <Section>
        <Checkbox
          data-test="Counter.ShowSecondaryValue"
          disabled={disabled}
          checked={options.secondaryValue.show}
          onChange={e => onChange({ show: e.target.checked })}>
          Show Secondary Value
        </Checkbox>
      </Section>
    </React.Fragment>
  );
}

SecondaryValueSettings.propTypes = EditorPropTypes;
