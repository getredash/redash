import React from "react";
import { Section, Input, ContextHelp } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

export default function GeneralSettings({ options, visualizationName, onOptionsChange }) {
  return (
    <React.Fragment>
      <Section>
        <Input
          layout="horizontal"
          label="Counter Label"
          className="w-100"
          data-test="Counter.CounterLabel"
          defaultValue={options.counterLabel}
          placeholder={visualizationName}
          onChange={e => onOptionsChange({ counterLabel: e.target.value })}
        />
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label={
            <>
              Number Format <ContextHelp.NumberFormatSpecs />
            </>
          }
          className="w-100"
          data-test="Counter.NumberFormat"
          defaultValue={options.numberFormat}
          onChange={e => onOptionsChange({ numberFormat: e.target.value })}
        />
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label="Formatting Decimal Character"
          className="w-100"
          data-test="Counter.DecimalCharacter"
          defaultValue={options.stringDecChar}
          onChange={e => onOptionsChange({ stringDecChar: e.target.value })}
        />
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label="Formatting Thousands Separator"
          className="w-100"
          data-test="Counter.ThousandsSeparator"
          defaultValue={options.stringThouSep}
          onChange={e => onOptionsChange({ stringThouSep: e.target.value })}
        />
      </Section>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
