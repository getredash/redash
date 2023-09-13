// @ts-nocheck

import { isNil, trimStart } from "lodash";
import React from "react";
import { Section, Switch, TextArea } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

const defaultCustomCode = trimStart(`
// Available variables are x, ys, element, and Plotly
// Type console.log(x, ys); for more info about x and ys
// To plot your graph call Plotly.plot(element, ...)
// Plotly examples and docs: https://plot.ly/javascript/
`);

export default function CustomChartSettings({ options, onOptionsChange }: any) {
  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <TextArea
          label="Custom code"
          data-test="Chart.Custom.Code"
          rows="10"
          defaultValue={isNil(options.customCode) ? defaultCustomCode : options.customCode}
          onChange={(event: any) => onOptionsChange({ customCode: event.target.value })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Switch
          data-test="Chart.Custom.EnableConsoleLogs"
          defaultChecked={options.enableConsoleLogs}
          onChange={(enableConsoleLogs: any) => onOptionsChange({ enableConsoleLogs })}>
          Show errors in the console
        </Switch>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Switch
          id="chart-editor-auto-update-custom-chart"
          data-test="Chart.Custom.AutoUpdate"
          defaultChecked={options.autoRedraw}
          onChange={(autoRedraw: any) => onOptionsChange({ autoRedraw })}>
          Auto update graph
        </Switch>
      </Section>
    </React.Fragment>
  );
}

CustomChartSettings.propTypes = EditorPropTypes;
