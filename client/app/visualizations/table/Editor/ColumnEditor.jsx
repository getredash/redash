import { map, keys } from "lodash";
import React from "react";
import { useDebouncedCallback } from "use-debounce";
import PropTypes from "prop-types";
import * as Grid from "antd/lib/grid";
import { Section, Select, Input, Checkbox, TextAlignmentSelect } from "@/components/visualizations/editor";

import ColumnTypes from "../columns";

export default function ColumnEditor({ column, onChange }) {
  function handleChange(changes) {
    onChange({ ...column, ...changes });
  }

  const [handleChangeDebounced] = useDebouncedCallback(handleChange, 200);

  const AdditionalOptions = ColumnTypes[column.displayAs].Editor || null;

  return (
    <div className="table-visualization-editor-column">
      <Section>
        <Grid.Row gutter={15} type="flex" align="middle">
          <Grid.Col span={16}>
            <Input
              data-test={`Table.Column.${column.name}.Title`}
              defaultValue={column.title}
              onChange={event => handleChangeDebounced({ title: event.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={8}>
            <TextAlignmentSelect
              data-test={`Table.Column.${column.name}.TextAlignment`}
              defaultValue={column.alignContent}
              onChange={event => handleChange({ alignContent: event.target.value })}
            />
          </Grid.Col>
        </Grid.Row>
      </Section>

      <Section>
        <Checkbox
          data-test={`Table.Column.${column.name}.UseForSearch`}
          defaultChecked={column.allowSearch}
          onChange={event => handleChange({ allowSearch: event.target.checked })}>
          Use for search
        </Checkbox>
      </Section>

      <Section>
        <Select
          label="Display as:"
          data-test={`Table.Column.${column.name}.DisplayAs`}
          className="w-100"
          defaultValue={column.displayAs}
          onChange={displayAs => handleChange({ displayAs })}>
          {map(ColumnTypes, ({ friendlyName }, key) => (
            <Select.Option key={key} data-test={`Table.Column.${column.name}.DisplayAs.${key}`}>
              {friendlyName}
            </Select.Option>
          ))}
        </Select>
      </Section>

      {AdditionalOptions && <AdditionalOptions column={column} onChange={handleChange} />}
    </div>
  );
}

ColumnEditor.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
    title: PropTypes.string,
    visible: PropTypes.bool,
    alignContent: PropTypes.oneOf(["left", "center", "right"]),
    displayAs: PropTypes.oneOf(keys(ColumnTypes)),
  }).isRequired,
  onChange: PropTypes.func,
};

ColumnEditor.defaultProps = {
  onChange: () => {},
};
