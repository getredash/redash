import React from 'react';
import Switch from 'antd/lib/switch';
import Section from '@/components/visualizations/editor/Section';
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

      <Section>
        <label className="d-flex align-items-center" htmlFor="chart-editor-x-axis-sort">
          <Switch
            id="chart-editor-x-axis-sort"
            data-test="Chart.XAxis.Sort"
            defaultChecked={options.sortX}
            onChange={sortX => onOptionsChange({ sortX })}
          />
          <span className="m-l-10">Sort Values</span>
        </label>
      </Section>

      <Section>
        <label className="d-flex align-items-center" htmlFor="chart-editor-x-axis-reverse">
          <Switch
            id="chart-editor-x-axis-reverse"
            data-test="Chart.XAxis.Reverse"
            defaultChecked={options.reverseX}
            onChange={reverseX => onOptionsChange({ reverseX })}
          />
          <span className="m-l-10">Reverse Order</span>
        </label>
      </Section>

      <Section>
        <label className="d-flex align-items-center" htmlFor="chart-editor-x-axis-show-labels">
          <Switch
            id="chart-editor-x-axis-show-labels"
            data-test="Chart.XAxis.ShowLabels"
            defaultChecked={options.xAxis.labels.enabled}
            onChange={enabled => onOptionsChange({ xAxis: { labels: { enabled } } })}
          />
          <span className="m-l-10">Show Labels</span>
        </label>
      </Section>
    </React.Fragment>
  );
}

XAxisSettings.propTypes = EditorPropTypes;
