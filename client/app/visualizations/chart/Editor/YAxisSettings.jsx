import React from 'react';
import Switch from 'antd/lib/switch';
import Section from '@/components/visualizations/editor/Section';
import { EditorPropTypes } from '@/visualizations';

import AxisSettings from './AxisSettings';

export default function YAxisSettings({ options, onOptionsChange }) {
  const [leftYAxis, rightYAxis] = options.yAxis;

  return (
    <React.Fragment>
      <Section>
        <h4>Left Y Axis</h4>
        <AxisSettings
          id="LeftYAxis"
          features={{ range: true }}
          options={leftYAxis}
          onChange={axis => onOptionsChange({ yAxis: [axis, rightYAxis] })}
        />
      </Section>

      {(options.globalSeriesType !== 'heatmap') && (
        <Section>
          <h4>Right Y Axis</h4>
          <AxisSettings
            id="RightYAxis"
            features={{ range: true }}
            options={rightYAxis}
            onChange={axis => onOptionsChange({ yAxis: [leftYAxis, axis] })}
          />
        </Section>
      )}

      {(options.globalSeriesType === 'heatmap') && (
        <React.Fragment>
          <Section>
            <label className="d-flex align-items-center" htmlFor="chart-editor-y-axis-sort">
              <Switch
                id="chart-editor-y-axis-sort"
                data-test="Chart.LeftYAxis.Sort"
                defaultChecked={options.sortY}
                onChange={sortY => onOptionsChange({ sortY })}
              />
              <span className="m-l-10">Sort Values</span>
            </label>
          </Section>

          <Section>
            <label className="d-flex align-items-center" htmlFor="chart-editor-y-axis-reverse">
              <Switch
                id="chart-editor-y-axis-reverse"
                data-test="Chart.LeftYAxis.Reverse"
                defaultChecked={options.reverseY}
                onChange={reverseY => onOptionsChange({ reverseY })}
              />
              <span className="m-l-10">Reverse Order</span>
            </label>
          </Section>
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

YAxisSettings.propTypes = EditorPropTypes;
