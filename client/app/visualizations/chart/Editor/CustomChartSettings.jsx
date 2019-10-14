import { isNil, trimStart } from 'lodash';
import React from 'react';
import Switch from 'antd/lib/switch';
import Input from 'antd/lib/input';
import { EditorPropTypes } from '@/visualizations';

const { TextArea } = Input;

const defaultCustomCode = trimStart(`
// Available variables are x, ys, element, and Plotly
// Type console.log(x, ys); for more info about x and ys
// To plot your graph call Plotly.plot(element, ...)
// Plotly examples and docs: https://plot.ly/javascript/
`);

export default function CustomChartSettings({ options, onOptionsChange }) {
  return (
    <React.Fragment>
      <div className="m-b-15">
        <label htmlFor="chart-editor-custom-code">Custom code</label>
        <TextArea
          id="chart-editor-custom-code"
          data-test="Chart.Custom.Code"
          className="form-control v-resizable"
          rows="10"
          defaultValue={isNil(options.customCode) ? defaultCustomCode : options.customCode}
          onChange={event => onOptionsChange({ customCode: event.target.value })}
        />
      </div>

      <div className="m-b-15">
        <label className="d-flex align-items-center" htmlFor="chart-editor-enable-console-logs">
          <Switch
            id="chart-editor-enable-console-logs"
            data-test="Chart.Custom.EnableConsoleLogs"
            defaultChecked={options.enableConsoleLogs}
            onChange={enableConsoleLogs => onOptionsChange({ enableConsoleLogs })}
          />
          <span className="m-l-10">Show errors in the console</span>
        </label>
      </div>

      <div className="m-b-15">
        <label className="d-flex align-items-center" htmlFor="chart-editor-auto-update-custom-chart">
          <Switch
            id="chart-editor-auto-update-custom-chart"
            data-test="Chart.Custom.AutoUpdate"
            defaultChecked={options.autoRedraw}
            onChange={autoRedraw => onOptionsChange({ autoRedraw })}
          />
          <span className="m-l-10">Auto update graph</span>
        </label>
      </div>
    </React.Fragment>
  );
}

CustomChartSettings.propTypes = EditorPropTypes;
