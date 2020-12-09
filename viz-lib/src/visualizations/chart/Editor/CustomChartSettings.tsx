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

export default function CustomChartSettings({
  options,
  onOptionsChange
}: any) {
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
        {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <Switch
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          data-test="Chart.Custom.EnableConsoleLogs"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          defaultChecked={options.enableConsoleLogs}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(enableConsoleLogs: any) => any' is not assi... Remove this comment to see the full error message
          onChange={(enableConsoleLogs: any) => onOptionsChange({ enableConsoleLogs })}>
          Show errors in the console
        </Switch>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <Switch
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          id="chart-editor-auto-update-custom-chart"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          data-test="Chart.Custom.AutoUpdate"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          defaultChecked={options.autoRedraw}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(autoRedraw: any) => any' is not assignable ... Remove this comment to see the full error message
          onChange={(autoRedraw: any) => onOptionsChange({ autoRedraw })}>
          Auto update graph
        </Switch>
      </Section>
    </React.Fragment>
  );
}

CustomChartSettings.propTypes = EditorPropTypes;
