import { isNil, trimStart } from "lodash";
import React from "react";
import { Section, Switch, TextArea } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";

const defaultCustomCode = trimStart(`
// Available variables are x, ys, element, and Plotly
// Type console.log(x, ys); for more info about x and ys
// To plot your graph call Plotly.plot(element, ...)
// Plotly examples and docs: https://plot.ly/javascript/
`);

export default function CustomChartSettings({ options, onOptionsChange }) {
  return (
    <React.Fragment>
      <Section>
        <TextArea
          label="Custom code"
          data-test="Chart.Custom.Code"
          className="form-control v-resizable"
          rows="10"
          defaultValue={isNil(options.customCode) ? defaultCustomCode : options.customCode}
          onChange={event => onOptionsChange({ customCode: event.target.value })}
        />
      </Section>

      <Section>
        <Switch
          data-test="Chart.Custom.EnableConsoleLogs"
          defaultChecked={options.enableConsoleLogs}
          onChange={enableConsoleLogs => onOptionsChange({ enableConsoleLogs })}>
          Show errors in the console
        </Switch>
      </Section>

      <Section>
        <Switch
          id="chart-editor-auto-update-custom-chart"
          data-test="Chart.Custom.AutoUpdate"
          defaultChecked={options.autoRedraw}
          onChange={autoRedraw => onOptionsChange({ autoRedraw })}>
          Auto update graph
        </Switch>
      </Section>
    </React.Fragment>
  );
}

CustomChartSettings.propTypes = EditorPropTypes;
