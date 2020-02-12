import React from "react";
import { Section, Input, InputNumber, Switch, ContextHelp } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";

import { isValueNumber } from "../utils";

export default function FormatSettings({ options, data, onOptionsChange }) {
  const inputsEnabled = isValueNumber(data.rows, options);
  return (
    <React.Fragment>
      <Section>
        <Input
          layout="horizontal"
          label={
            <React.Fragment>
              Values Format
              <ContextHelp.NumberFormatSpecs />
            </React.Fragment>
          }
          className="w-100"
          defaultValue={options.valuesFormat}
          onChange={e => onOptionsChange({ valuesFormat: e.target.value })}
        />
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label={
            <React.Fragment>
              Percent Format
              <ContextHelp.NumberFormatSpecs />
            </React.Fragment>
          }
          className="w-100"
          defaultValue={options.percentFormat}
          onChange={e => onOptionsChange({ percentFormat: e.target.value })}
        />
      </Section>

      <Section>
        <Switch
          defaultChecked={options.showDeltaPercentage}
          onChange={showDeltaPercentage => onOptionsChange({ showDeltaPercentage })}>
          Show delta as percentage
        </Switch>
      </Section>

      <Section>
        <Switch
          defaultChecked={options.showDeltaAmount}
          onChange={showDeltaAmount => onOptionsChange({ showDeltaAmount })}>
          Show delta as amount
        </Switch>
      </Section>

      <Section>
        <Switch
          defaultChecked={options.invertTrendDirection}
          onChange={invertTrendDirection => onOptionsChange({ invertTrendDirection })}>
          Invert trend direction
        </Switch>
      </Section>
    </React.Fragment>
  );
}

FormatSettings.propTypes = EditorPropTypes;
