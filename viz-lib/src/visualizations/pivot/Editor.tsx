import { merge } from "lodash";
import React from "react";
import { Section, Switch } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

export default function Editor({
  options,
  onOptionsChange
}: any) {
  const updateOptions = (updates: any) => {
    onOptionsChange(merge({}, options, updates));
  };

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <Switch
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          data-test="PivotEditor.HideControls"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          id="pivot-show-controls"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'.
          defaultChecked={!options.controls.enabled}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(enabled: any) => void' is not assignable to... Remove this comment to see the full error message
          onChange={(enabled: any) => updateOptions({ controls: { enabled: !enabled } })}>
          Show Pivot Controls
        </Switch>
      </Section>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <Switch
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          id="pivot-show-row-totals"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          defaultChecked={options.rendererOptions.table.rowTotals}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(rowTotals: any) => void' is not assignable ... Remove this comment to see the full error message
          onChange={(rowTotals: any) => updateOptions({ rendererOptions: { table: { rowTotals } } })}>
          Show Row Totals
        </Switch>
      </Section>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <Switch
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          id="pivot-show-column-totals"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          defaultChecked={options.rendererOptions.table.colTotals}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(colTotals: any) => void' is not assignable ... Remove this comment to see the full error message
          onChange={(colTotals: any) => updateOptions({ rendererOptions: { table: { colTotals } } })}>
          Show Column Totals
        </Switch>
      </Section>
    </React.Fragment>
  );
}

Editor.propTypes = EditorPropTypes;
