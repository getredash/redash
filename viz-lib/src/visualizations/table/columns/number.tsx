import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { Section, Input, ContextHelp } from "@/components/visualizations/editor";
import { createNumberFormatter } from "@/lib/value-format";

type Props = {
    column: {
        name: string;
        numberFormat?: string;
    };
    onChange: (...args: any[]) => any;
};

function Editor({ column, onChange }: Props) {
  const [onChangeDebounced] = useDebouncedCallback(onChange, 200);

  return (
    // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
    <Section>
      <Input
        label={
          <React.Fragment>
            Number format
            <ContextHelp.NumberFormatSpecs />
          </React.Fragment>
        }
        data-test="Table.ColumnEditor.Number.Format"
        defaultValue={column.numberFormat}
        onChange={(event: any) => onChangeDebounced({ numberFormat: event.target.value })}
      />
    </Section>
  );
}

export default function initNumberColumn(column: any) {
  const format = createNumberFormatter(column.numberFormat);

  function prepareData(row: any) {
    return {
      text: format(row[column.name]),
    };
  }

  function NumberColumn({
    row
  }: any) {
    // eslint-disable-line react/prop-types
    const { text } = prepareData(row);
    return text;
  }

  NumberColumn.prepareData = prepareData;

  return NumberColumn;
}

initNumberColumn.friendlyName = "Number";
initNumberColumn.Editor = Editor;
