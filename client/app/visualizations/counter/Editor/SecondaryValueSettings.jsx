import React, { useCallback } from "react";
import { Section, Checkbox } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";
import CounterValueOptions from "./CounterValueOptions";

export default function SecondaryValueSettings({ options, data, onOptionsChange }) {
  const onChange = useCallback(secondaryValue => onOptionsChange({ secondaryValue }), [onOptionsChange]);

  return (
    <React.Fragment>
      <Section>
        <Checkbox checked={options.secondaryValue.show} onChange={e => onChange({ show: e.target.checked })}>
          Show Secondary Value
        </Checkbox>
      </Section>
      <CounterValueOptions
        disabled={!options.secondaryValue.show}
        options={options.secondaryValue}
        data={data}
        onChange={onChange}
      />
    </React.Fragment>
  );
}

SecondaryValueSettings.propTypes = EditorPropTypes;
