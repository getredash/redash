import { merge } from 'lodash';
import React, { useState } from 'react';
import Switch from 'antd/lib/switch';
import { EditorPropTypes } from '@/visualizations';

export default function Editor({ options, onOptionsChange }) {
  const [hideRowTotals, setHideRowTotals] = useState(
    options.rendererOptions &&
      options.rendererOptions.table &&
      options.rendererOptions.table.rowTotals === false,
  );

  const [hideColTotals, setHideColTotals] = useState(
    options.rendererOptions &&
      options.rendererOptions.table &&
      options.rendererOptions.table.colTotals === false,
  );

  const updateOptions = (updates) => {
    onOptionsChange(merge({}, options, updates));
  };

  return (
    <div className="form-group">
      <label className="d-flex align-items-center" htmlFor="pivot-show-controls">
        <Switch
          data-test="PivotEditor.HideControls"
          id="pivot-show-controls"
          checked={options.controls.enabled}
          onChange={enabled => updateOptions({ controls: { enabled } })}
        />
        <span className="m-l-10">Hide Pivot Controls</span>
      </label>
      <label className="d-flex align-items-center" htmlFor="pivot-show-row-totals">
        <Switch
          id="pivot-show-row-totals"
          checked={hideRowTotals}
          onChange={(rowTotals) => {
            updateOptions({ rendererOptions: { table: { rowTotals: !rowTotals } } });
            setHideRowTotals(rowTotals);
          }}
        />
        <span className="m-l-10">Hide Row Totals</span>
      </label>
      <label className="d-flex align-items-center" htmlFor="pivot-show-col-totals">
        <Switch
          id="pivot-show-row-totals"
          checked={hideColTotals}
          onChange={(colTotals) => {
            updateOptions({ rendererOptions: { table: { colTotals: !colTotals } } });
            setHideColTotals(colTotals);
          }}
        />
        <span className="m-l-10">Hide Column Totals</span>
      </label>
    </div>
  );
}

Editor.propTypes = EditorPropTypes;
