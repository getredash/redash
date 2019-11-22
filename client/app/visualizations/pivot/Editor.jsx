import { merge } from 'lodash';
import React from 'react';
import Switch from 'antd/lib/switch';
import Section from '@/components/visualizations/editor/Section';
import { EditorPropTypes } from '@/visualizations';

export default function Editor({ options, onOptionsChange }) {
  const updateOptions = (updates) => {
    onOptionsChange(merge({}, options, updates));
  };

  return (
    <React.Fragment>
      <Section>
        <label className="d-flex align-items-center" htmlFor="pivot-show-controls">
          <Switch
            data-test="PivotEditor.HideControls"
            id="pivot-show-controls"
            checked={!options.controls.enabled}
            onChange={enabled => updateOptions({ controls: { enabled: !enabled } })}
          />
          <span className="m-l-10">Show Pivot Controls</span>
        </label>
      </Section>
      <Section>
        <label className="d-flex align-items-center" htmlFor="pivot-show-row-totals">
          <Switch
            id="pivot-show-row-totals"
            checked={options.rendererOptions.table.rowTotals}
            onChange={rowTotals => updateOptions({ rendererOptions: { table: { rowTotals } } })}
          />
          <span className="m-l-10">Show Row Totals</span>
        </label>
      </Section>
      <Section>
        <label className="d-flex align-items-center" htmlFor="pivot-show-column-totals">
          <Switch
            id="pivot-show-column-totals"
            checked={options.rendererOptions.table.colTotals}
            onChange={colTotals => updateOptions({ rendererOptions: { table: { colTotals } } })}
          />
          <span className="m-l-10">Show Column Totals</span>
        </label>
      </Section>
    </React.Fragment>
  );
}

Editor.propTypes = EditorPropTypes;
