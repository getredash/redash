import React from "react";
import PropTypes from "prop-types";
import { useDebouncedCallback } from "use-debounce";
import { Section, Input } from "@/components/visualizations/editor";
import { createBooleanFormatter } from "@/lib/value-format";

function Editor({ column, onChange }) {
  function handleChange(index, value) {
    const booleanValues = [...column.booleanValues];
    booleanValues.splice(index, 1, value);
    onChange({ booleanValues });
  }

  const [handleChangeDebounced] = useDebouncedCallback(handleChange, 200);

  return (
    <React.Fragment>
      <Section>
        <Input
          label={
            <React.Fragment>
              Value for <code>false</code>
            </React.Fragment>
          }
          data-test="Table.ColumnEditor.Boolean.False"
          defaultValue={column.booleanValues[0]}
          onChange={event => handleChangeDebounced(0, event.target.value)}
        />
      </Section>

      <Section>
        <Input
          label={
            <React.Fragment>
              Value for <code>true</code>
            </React.Fragment>
          }
          data-test="Table.ColumnEditor.Boolean.True"
          defaultValue={column.booleanValues[1]}
          onChange={event => handleChangeDebounced(1, event.target.value)}
        />
      </Section>
    </React.Fragment>
  );
}

Editor.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
    booleanValues: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default function initBooleanColumn(column) {
  const format = createBooleanFormatter(column.booleanValues);

  function prepareData(row) {
    return {
      text: format(row[column.name]),
    };
  }

  function BooleanColumn({ row }) {
    // eslint-disable-line react/prop-types
    const { text } = prepareData(row);
    return text;
  }

  BooleanColumn.prepareData = prepareData;

  return BooleanColumn;
}

initBooleanColumn.friendlyName = "Boolean";
initBooleanColumn.Editor = Editor;
