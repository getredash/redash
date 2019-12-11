import { map } from "lodash";
import React, { useMemo } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Section, Select, Input, Checkbox } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";

export default function GeneralSettings({ options, data, onOptionsChange }) {
  const columnNames = useMemo(() => map(data.columns, c => c.name), [data]);

  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);

  return (
    <React.Fragment>
      <Section>
        <Select
          layout="horizontal"
          label="Step Column"
          className="w-100"
          data-test="Funnel.StepColumn"
          placeholder="Choose column..."
          defaultValue={options.stepCol.colName || undefined}
          onChange={colName => onOptionsChange({ stepCol: { colName: colName || null } })}>
          {map(columnNames, col => (
            <Select.Option key={col} data-test={`Funnel.StepColumn.${col}`}>
              {col}
            </Select.Option>
          ))}
        </Select>
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label="Step Column Title"
          className="w-100"
          data-test="Funnel.StepColumnTitle"
          defaultValue={options.stepCol.displayAs}
          onChange={event => onOptionsChangeDebounced({ stepCol: { displayAs: event.target.value } })}
        />
      </Section>

      <Section>
        <Select
          layout="horizontal"
          label="Value Column"
          className="w-100"
          data-test="Funnel.ValueColumn"
          placeholder="Choose column..."
          defaultValue={options.valueCol.colName || undefined}
          onChange={colName => onOptionsChange({ valueCol: { colName: colName || null } })}>
          {map(columnNames, col => (
            <Select.Option key={col} data-test={`Funnel.ValueColumn.${col}`}>
              {col}
            </Select.Option>
          ))}
        </Select>
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label="Value Column Title"
          className="w-100"
          data-test="Funnel.ValueColumnTitle"
          defaultValue={options.valueCol.displayAs}
          onChange={event => onOptionsChangeDebounced({ valueCol: { displayAs: event.target.value } })}
        />
      </Section>

      <Section>
        <Checkbox
          data-test="Funnel.CustomSort"
          checked={!options.autoSort}
          onChange={event => onOptionsChange({ autoSort: !event.target.checked })}>
          Custom Sorting
        </Checkbox>
      </Section>

      {!options.autoSort && (
        <React.Fragment>
          <Section>
            <Select
              layout="horizontal"
              label="Sort Column"
              className="w-100"
              data-test="Funnel.SortColumn"
              allowClear
              placeholder="Choose column..."
              defaultValue={options.sortKeyCol.colName || undefined}
              onChange={colName => onOptionsChange({ sortKeyCol: { colName: colName || null } })}>
              {map(columnNames, col => (
                <Select.Option key={col} data-test={`Funnel.SortColumn.${col}`}>
                  {col}
                </Select.Option>
              ))}
            </Select>
          </Section>

          <Section>
            <Select
              layout="horizontal"
              label="Sort Order"
              className="w-100"
              data-test="Funnel.SortDirection"
              disabled={!options.sortKeyCol.colName}
              defaultValue={options.sortKeyCol.reverse ? "desc" : "asc"}
              onChange={order => onOptionsChange({ sortKeyCol: { reverse: order === "desc" } })}>
              <Select.Option value="asc" data-test="Funnel.SortDirection.Ascending">
                ascending
              </Select.Option>
              <Select.Option value="desc" data-test="Funnel.SortDirection.Descending">
                descending
              </Select.Option>
            </Select>
          </Section>
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
