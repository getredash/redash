import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { Section, Input } from "@/components/visualizations/editor";
import { createBooleanFormatter } from "@/lib/value-format";

type Props = {
    column: {
        name: string;
        booleanValues?: string[];
    };
    onChange: (...args: any[]) => any;
};

function Editor({ column, onChange }: Props) {
  function handleChange(index: any, value: any) {
    // @ts-expect-error ts-migrate(2488) FIXME: Type 'string[] | undefined' must have a '[Symbol.i... Remove this comment to see the full error message
    const booleanValues = [...column.booleanValues];
    booleanValues.splice(index, 1, value);
    onChange({ booleanValues });
  }

  const [handleChangeDebounced] = useDebouncedCallback(handleChange, 200);

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          label={
            <React.Fragment>
              Value for <code>false</code>
            </React.Fragment>
          }
          data-test="Table.ColumnEditor.Boolean.False"
          // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
          defaultValue={column.booleanValues[0]}
          onChange={(event: any) => handleChangeDebounced(0, event.target.value)}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          label={
            <React.Fragment>
              Value for <code>true</code>
            </React.Fragment>
          }
          data-test="Table.ColumnEditor.Boolean.True"
          // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
          defaultValue={column.booleanValues[1]}
          onChange={(event: any) => handleChangeDebounced(1, event.target.value)}
        />
      </Section>
    </React.Fragment>
  );
}

export default function initBooleanColumn(column: any) {
  const format = createBooleanFormatter(column.booleanValues);

  function prepareData(row: any) {
    return {
      text: format(row[column.name]),
    };
  }

  function BooleanColumn({
    row
  }: any) {
    // eslint-disable-line react/prop-types
    const { text } = prepareData(row);
    return text;
  }

  BooleanColumn.prepareData = prepareData;

  return BooleanColumn;
}

initBooleanColumn.friendlyName = "Boolean";
initBooleanColumn.Editor = Editor;
