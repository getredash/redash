import React from "react";
import { Section, Input, InputNumber, Switch } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

import { isValueNumber } from "../utils";

export default function FormatSettings({
  options,
  data,
  onOptionsChange
}: any) {
  const inputsEnabled = isValueNumber(data.rows, options);
  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <InputNumber
          layout="horizontal"
          label="Formatting Decimal Place"
          data-test="Counter.Formatting.DecimalPlace"
          defaultValue={options.stringDecimal}
          disabled={!inputsEnabled}
          onChange={(stringDecimal: any) => onOptionsChange({ stringDecimal })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          layout="horizontal"
          label="Formatting Decimal Character"
          data-test="Counter.Formatting.DecimalCharacter"
          defaultValue={options.stringDecChar}
          disabled={!inputsEnabled}
          onChange={(e: any) => onOptionsChange({ stringDecChar: e.target.value })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          layout="horizontal"
          label="Formatting Thousands Separator"
          data-test="Counter.Formatting.ThousandsSeparator"
          defaultValue={options.stringThouSep}
          disabled={!inputsEnabled}
          onChange={(e: any) => onOptionsChange({ stringThouSep: e.target.value })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          layout="horizontal"
          label="Formatting String Prefix"
          data-test="Counter.Formatting.StringPrefix"
          defaultValue={options.stringPrefix}
          disabled={!inputsEnabled}
          onChange={(e: any) => onOptionsChange({ stringPrefix: e.target.value })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          layout="horizontal"
          label="Formatting String Suffix"
          data-test="Counter.Formatting.StringSuffix"
          defaultValue={options.stringSuffix}
          disabled={!inputsEnabled}
          onChange={(e: any) => onOptionsChange({ stringSuffix: e.target.value })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <Switch
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          data-test="Counter.Formatting.FormatTargetValue"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          defaultChecked={options.formatTargetValue}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(formatTargetValue: any) => any' is not assi... Remove this comment to see the full error message
          onChange={(formatTargetValue: any) => onOptionsChange({ formatTargetValue })}>
          Format Target Value
        </Switch>
      </Section>
    </React.Fragment>
  );
}

FormatSettings.propTypes = EditorPropTypes;
