import React from "react";
import { Section, Input, InputNumber, Switch } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";

import { isValueNumber } from "../utils";

export default function FormatSettings({ options, data, onOptionsChange }) {
  const inputsEnabled = isValueNumber(data.rows, options);
  return (
    <React.Fragment>
      <Section>
        <InputNumber
          layout="horizontal"
          label="Formatting Decimal Place"
          className="w-100"
          data-test="Counter.Formatting.DecimalPlace"
          defaultValue={options.stringDecimal}
          disabled={!inputsEnabled}
          onChange={stringDecimal => onOptionsChange({ stringDecimal })}
        />
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label="Formatting Decimal Character"
          className="w-100"
          data-test="Counter.Formatting.DecimalCharacter"
          defaultValue={options.stringDecChar}
          disabled={!inputsEnabled}
          onChange={e => onOptionsChange({ stringDecChar: e.target.value })}
        />
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label="Formatting Thousands Separator"
          className="w-100"
          data-test="Counter.Formatting.ThousandsSeparator"
          defaultValue={options.stringThouSep}
          disabled={!inputsEnabled}
          onChange={e => onOptionsChange({ stringThouSep: e.target.value })}
        />
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label="Formatting String Prefix"
          className="w-100"
          data-test="Counter.Formatting.StringPrefix"
          defaultValue={options.stringPrefix}
          disabled={!inputsEnabled}
          onChange={e => onOptionsChange({ stringPrefix: e.target.value })}
        />
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label="Formatting String Suffix"
          className="w-100"
          data-test="Counter.Formatting.StringSuffix"
          defaultValue={options.stringSuffix}
          disabled={!inputsEnabled}
          onChange={e => onOptionsChange({ stringSuffix: e.target.value })}
        />
      </Section>

      <Section>
        <Switch
          data-test="Counter.Formatting.FormatTargetValue"
          defaultChecked={options.formatTargetValue}
          onChange={formatTargetValue => onOptionsChange({ formatTargetValue })}>
          Format Target Value
        </Switch>
      </Section>
    </React.Fragment>
  );
}

FormatSettings.propTypes = EditorPropTypes;
