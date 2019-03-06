import React from 'react';
import Input from 'antd/lib/input';
import { EditorPropTypes } from '@/visualizations';

export default function Editor({ options, onOptionsChange }) {
  const onXAxisLabelChanged = (xAxisLabel) => {
    const newOptions = { ...options, xAxisLabel };
    onOptionsChange(newOptions);
  };

  const onYAxisLabelChanged = (yAxisLabel) => {
    const newOptions = { ...options, yAxisLabel };
    onOptionsChange(newOptions);
  };

  return (
    <div>
      <div className="form-group">
        <label className="control-label" htmlFor="box-plot-x-axis-label">X Axis Label</label>
        <Input
          id="box-plot-x-axis-label"
          value={options.xAxisLabel}
          onChange={event => onXAxisLabelChanged(event.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="control-label" htmlFor="box-plot-y-axis-label">Y Axis Label</label>
        <Input
          id="box-plot-y-axis-label"
          value={options.yAxisLabel}
          onChange={event => onYAxisLabelChanged(event.target.value)}
        />
      </div>
    </div>
  );
}

Editor.propTypes = EditorPropTypes;
