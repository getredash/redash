import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { Section, Input, InputNumber, ContextHelp } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

export default function AppearanceSettings({
  options,
  onOptionsChange
}: any) {
  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          layout="horizontal"
          label={
            <React.Fragment>
              Number Values Format
              <ContextHelp.NumberFormatSpecs />
            </React.Fragment>
          }
          data-test="Funnel.NumberFormat"
          defaultValue={options.numberFormat}
          onChange={(event: any) => onOptionsChangeDebounced({ numberFormat: event.target.value })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          layout="horizontal"
          label={
            <React.Fragment>
              Percent Values Format
              <ContextHelp.NumberFormatSpecs />
            </React.Fragment>
          }
          data-test="Funnel.PercentFormat"
          defaultValue={options.percentFormat}
          onChange={(event: any) => onOptionsChangeDebounced({ percentFormat: event.target.value })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <InputNumber
          layout="horizontal"
          label="Items Count Limit"
          data-test="Funnel.ItemsLimit"
          min={2}
          defaultValue={options.itemsLimit}
          onChange={(itemsLimit: any) => onOptionsChangeDebounced({ itemsLimit })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <InputNumber
          layout="horizontal"
          label="Min Percent Value"
          data-test="Funnel.PercentRangeMin"
          min={0}
          defaultValue={options.percentValuesRange.min}
          onChange={(min: any) => onOptionsChangeDebounced({ percentValuesRange: { min } })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <InputNumber
          layout="horizontal"
          label="Max Percent Value"
          data-test="Funnel.PercentRangeMax"
          min={0}
          defaultValue={options.percentValuesRange.max}
          onChange={(max: any) => onOptionsChangeDebounced({ percentValuesRange: { max } })}
        />
      </Section>
    </React.Fragment>
  );
}

AppearanceSettings.propTypes = EditorPropTypes;
