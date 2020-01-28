import React from "react";
import { Section, Input, InputNumber, Checkbox, ContextHelp } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

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
        <Checkbox
          data-test="Counter.Formatting.FormatTargetValue"
          checked={options.formatTargetValue}
          onChange={event => onOptionsChange({ formatTargetValue: event.target.checked })}>
          Format Target Value
        </Checkbox>
      </Section>

      <Section>
        <Checkbox
          data-test="Counter.ShowTooltip"
          checked={options.showTooltip}
          onChange={event => onOptionsChange({ showTooltip: event.target.checked })}>
          Show Tooltip
        </Checkbox>
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label={
            <React.Fragment>
              Tooltip Format <ContextHelp.NumberFormatSpecs />
            </React.Fragment>
          }
          className="w-100"
          data-test="Counter.TooltipFormat"
          defaultValue={options.tooltipFormat}
          disabled={!inputsEnabled || !options.showTooltip}
          onChange={e => onOptionsChange({ tooltipFormat: e.target.value })}
        />
      </Section>
    </React.Fragment>
  );
}

FormatSettings.propTypes = EditorPropTypes;
