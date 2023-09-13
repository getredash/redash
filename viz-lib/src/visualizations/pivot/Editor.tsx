// @ts-nocheck

import { merge } from "lodash";
import React from "react";
import { Section, Switch } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

export default function Editor({ options, onOptionsChange }: any) {
  const updateOptions = (updates: any) => {
    onOptionsChange(merge({}, options, updates));
  };

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Switch
          data-test="PivotEditor.HideControls"
          id="pivot-show-controls"
          defaultChecked={!options.controls.enabled}
          onChange={(enabled: any) => updateOptions({ controls: { enabled: !enabled } })}>
          Show Pivot Controls
        </Switch>
      </Section>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Switch
          id="pivot-show-row-totals"
          defaultChecked={options.rendererOptions.table.rowTotals}
          onChange={(rowTotals: any) => updateOptions({ rendererOptions: { table: { rowTotals } } })}>
          Show Row Totals
        </Switch>
      </Section>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Switch
          id="pivot-show-column-totals"
          defaultChecked={options.rendererOptions.table.colTotals}
          onChange={(colTotals: any) => updateOptions({ rendererOptions: { table: { colTotals } } })}>
          Show Column Totals
        </Switch>
      </Section>
    </React.Fragment>
  );
}

Editor.propTypes = EditorPropTypes;
