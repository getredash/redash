import { merge } from 'lodash';
import React from 'react';
import Switch from 'antd/lib/switch';
import { EditorPropTypes } from '@/visualizations';

export default function Editor({ options, onOptionsChange }) {
  const updateOptions = (updates) => {
    onOptionsChange(merge({}, options, updates));
  };

  return (
    <div className="form-group">
      <label className="d-flex align-items-center" htmlFor="pivot-show-controls">
        <span className="m-r-10">Hide Pivot Controls</span>
        <Switch
          data-test="PivotEditor.HideControls"
          id="pivot-show-controls"
          checked={options.controls.enabled}
          onChange={enabled => updateOptions({ controls: { enabled } })}
        />
      </label>
    </div>
  );
}

Editor.propTypes = EditorPropTypes;
