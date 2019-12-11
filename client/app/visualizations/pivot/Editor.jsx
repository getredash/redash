import { merge } from "lodash";
import React from "react";
import { Section, Switch } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";

export default function Editor({ options, onOptionsChange }) {
  const updateOptions = updates => {
    onOptionsChange(merge({}, options, updates));
  };

  return (
    <React.Fragment>
      <Section>
        <Switch
          data-test="PivotEditor.HideControls"
          id="pivot-show-controls"
          defaultChecked={!options.controls.enabled}
          onChange={enabled => updateOptions({ controls: { enabled: !enabled } })}>
          Show Pivot Controls
        </Switch>
      </Section>
      <Section>
        <Switch
          id="pivot-show-row-totals"
          defaultChecked={options.rendererOptions.table.rowTotals}
          onChange={rowTotals => updateOptions({ rendererOptions: { table: { rowTotals } } })}>
          Show Row Totals
        </Switch>
      </Section>
      <Section>
        <Switch
          id="pivot-show-column-totals"
          defaultChecked={options.rendererOptions.table.colTotals}
          onChange={colTotals => updateOptions({ rendererOptions: { table: { colTotals } } })}>
          Show Column Totals
        </Switch>
      </Section>
    </React.Fragment>
  );
}

Editor.propTypes = EditorPropTypes;
