import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { Section, Input, ContextHelp } from "@/components/visualizations/editor";
import { createDateTimeFormatter } from "@/lib/value-format";

type Props = {
    column: {
        name: string;
        dateTimeFormat?: string;
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
            Date/Time format
            <ContextHelp.DateTimeFormatSpecs />
          </React.Fragment>
        }
        data-test="Table.ColumnEditor.DateTime.Format"
        defaultValue={column.dateTimeFormat}
        onChange={(event: any) => onChangeDebounced({ dateTimeFormat: event.target.value })}
      />
    </Section>
  );
}

export default function initDateTimeColumn(column: any) {
  const format = createDateTimeFormatter(column.dateTimeFormat);

  function prepareData(row: any) {
    return {
      text: format(row[column.name]),
    };
  }

  function DateTimeColumn({
    row
  }: any) {
    // eslint-disable-line react/prop-types
    const { text } = prepareData(row);
    return text;
  }

  DateTimeColumn.prepareData = prepareData;

  return DateTimeColumn;
}

initDateTimeColumn.friendlyName = "Date/Time";
initDateTimeColumn.Editor = Editor;
