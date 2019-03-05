import { merge } from 'lodash';
import React from 'react';
import Switch from 'antd/lib/switch';
import { EditorPropTypes } from '@/visualizations';

export default function Editor({ options, onOptionsChange }) {
  const updateOptions = (updates) => {
    onOptionsChange(merge({}, options, updates));
  };

  return (
    <div className="form-horizontal">
      <div className="form-group">
        <div className="col-lg-6">
          <label className="d-flex align-items-center" htmlFor="pivot-show-controls">
            <span className="m-r-10">Hide Pivot Controls</span>
            <Switch
              id="pivot-show-controls"
              checked={options.controls.enabled}
              onChange={enabled => updateOptions({ controls: { enabled } })}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

Editor.propTypes = EditorPropTypes;
