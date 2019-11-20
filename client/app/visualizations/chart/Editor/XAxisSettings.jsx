import React from 'react';
import Switch from 'antd/lib/switch';
import { EditorPropTypes } from '@/visualizations';

import AxisSettings from './AxisSettings';

export default function XAxisSettings({ options, onOptionsChange }) {
  return (
    <React.Fragment>
      <AxisSettings
        id="XAxis"
        features={{ autoDetectType: true }}
        options={options.xAxis}
        onChange={xAxis => onOptionsChange({ xAxis })}
      />

      <div className="m-b-15">
        <label className="d-flex align-items-center" htmlFor="chart-editor-x-axis-sort">
          <Switch
            id="chart-editor-x-axis-sort"
            data-test="Chart.XAxis.Sort"
            defaultChecked={options.sortX}
            onChange={sortX => onOptionsChange({ sortX })}
          />
          <span className="m-l-10">Sort Values</span>
        </label>
      </div>

      <div className="m-b-15">
        <label className="d-flex align-items-center" htmlFor="chart-editor-x-axis-reverse">
          <Switch
            id="chart-editor-x-axis-reverse"
            data-test="Chart.XAxis.Reverse"
            defaultChecked={options.reverseX}
            onChange={reverseX => onOptionsChange({ reverseX })}
          />
          <span className="m-l-10">Reverse Order</span>
        </label>
      </div>

      <div className="m-b-15">
        <label className="d-flex align-items-center" htmlFor="chart-editor-x-axis-show-labels">
          <Switch
            id="chart-editor-x-axis-show-labels"
            data-test="Chart.XAxis.ShowLabels"
            defaultChecked={options.xAxis.labels.enabled}
            onChange={enabled => onOptionsChange({ xAxis: { labels: { enabled } } })}
          />
          <span className="m-l-10">Show Labels</span>
        </label>
      </div>
    </React.Fragment>
  );
}

XAxisSettings.propTypes = EditorPropTypes;
