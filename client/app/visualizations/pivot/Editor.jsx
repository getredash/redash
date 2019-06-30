import { merge } from 'lodash';
import React from 'react';
import Switch from 'antd/lib/switch';
import { EditorPropTypes } from '@/visualizations';

export default function Editor({ options, onOptionsChange }) {
  const updateOptions = (updates) => {
    onOptionsChange(merge({}, options, updates));
  };

  return (
    <div className="form-group m-t-30">
      <label className="d-flex align-items-center" htmlFor="pivot-show-controls">
        <Switch
          data-test="PivotEditor.HideControls"
          id="pivot-show-controls"
          checked={!options.controls.enabled}
          onChange={enabled => updateOptions({ controls: { enabled: !enabled } })}
        />
        <span className="m-l-10">Show Pivot Controls</span>
      </label>
      <label className="d-flex align-items-center" htmlFor="pivot-show-row-totals">
        <Switch
          id="pivot-show-row-totals"
          checked={options.rendererOptions.table.rowTotals}
          onChange={rowTotals => updateOptions({ rendererOptions: { table: { rowTotals } } })}
        />
        <span className="m-l-10">Show Row Totals</span>
      </label>
      <label className="d-flex align-items-center" htmlFor="pivot-show-col-totals">
        <Switch
          id="pivot-show-row-totals"
          checked={options.rendererOptions.table.colTotals}
          onChange={colTotals => updateOptions({ rendererOptions: { table: { colTotals } } })}
        />
        <span className="m-l-10">Show Column Totals</span>
      </label>
    </div>
  );
}

Editor.propTypes = EditorPropTypes;
