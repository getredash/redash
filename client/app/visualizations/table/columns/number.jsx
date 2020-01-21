import React from "react";
import PropTypes from "prop-types";
import { useDebouncedCallback } from "use-debounce";
import { Section, Input, ContextHelp } from "@/components/visualizations/editor";
import { createNumberFormatter } from "@/lib/value-format";

function Editor({ column, onChange }) {
  const [onChangeDebounced] = useDebouncedCallback(onChange, 200);

  return (
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
        onChange={event => onChangeDebounced({ numberFormat: event.target.value })}
      />
    </Section>
  );
}

Editor.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
    numberFormat: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function initNumberColumn(column) {
  const format = createNumberFormatter(column.numberFormat);

  function prepareData(row) {
    return {
      text: format(row[column.name]),
    };
  }

  function NumberColumn({ row }) {
    // eslint-disable-line react/prop-types
    const { text } = prepareData(row);
    return text;
  }

  NumberColumn.prepareData = prepareData;

  return NumberColumn;
}

initNumberColumn.friendlyName = "Number";
initNumberColumn.Editor = Editor;
