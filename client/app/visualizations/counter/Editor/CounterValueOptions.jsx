import { isNil, get, map, includes } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import { Section, InputNumber, Input, Select, Checkbox, ContextHelp } from "@/components/visualizations/editor";

export default function CounterValueOptions({ disabled, counterTypes, options, data, onChange }) {
  const additionalOptions = get(counterTypes, [options.type, "options"], []);
  const canReturnRow = get(counterTypes, [options.type, "canReturnRow"], false);

  const formatInfo = (
    <ContextHelp placement="topLeft" arrowPointAtCenter>
      <div className="m-b-5">Use special names to access additional properties:</div>
      <div>
        <code>{"{{ @@value }}"}</code> raw value (as string);
      </div>
      <div>
        <code>{"{{ @@value_formatted }}"}</code> formatted value;
      </div>
      {canReturnRow && (
        <div className="m-t-5">
          Query result columns can be referenced using <code>{"{{ column_name }}"}</code> syntax.
        </div>
      )}
    </ContextHelp>
  );

  return (
    <React.Fragment>
      <Section>
        <Select
          layout="horizontal"
          label="Type"
          data-test="Counter.CounterType"
          className="w-100"
          defaultValue={options.type}
          onChange={type => onChange({ type })}>
          {map(counterTypes, ({ name }, type) => (
            <Select.Option key={type} data-test={`Counter.CounterType.${type}`}>
              {name}
            </Select.Option>
          ))}
        </Select>
      </Section>

      {includes(additionalOptions, "column") && (
        <Section>
          <Select
            layout="horizontal"
            label="Column Name"
            data-test="Counter.ColumnName"
            className="w-100"
            disabled={disabled}
            allowClear
            placeholder="Select column..."
            defaultValue={isNil(options.column) ? undefined : options.column}
            onChange={column => onChange({ column: column || null })}>
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={`Counter.ColumnName.${col.name}`}>
                {col.name}
              </Select.Option>
            ))}
          </Select>
        </Section>
      )}

      {includes(additionalOptions, "rowNumber") && (
        <Section>
          <InputNumber
            layout="horizontal"
            label="Row Number"
            data-test="Counter.RowNumber"
            className="w-100"
            disabled={disabled}
            defaultValue={options.rowNumber}
            onChange={rowNumber => onChange({ rowNumber })}
          />
        </Section>
      )}

      <Section>
        <Input
          layout="horizontal"
          label={<React.Fragment>Display Format {formatInfo}</React.Fragment>}
          data-test="Counter.DisplayFormat"
          className="w-100"
          disabled={disabled}
          defaultValue={options.displayFormat}
          onChange={e => onChange({ displayFormat: e.target.value })}
        />
      </Section>

      <Section>
        <Checkbox
          data-test="Counter.ShowTooltip"
          disabled={disabled}
          checked={options.showTooltip}
          onChange={e => onChange({ showTooltip: e.target.checked })}>
          Show Tooltip
        </Checkbox>
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label={<React.Fragment>Tooltip Format {formatInfo}</React.Fragment>}
          data-test="Counter.TooltipFormat"
          className="w-100"
          disabled={disabled || !options.showTooltip}
          defaultValue={options.tooltipFormat}
          onChange={e => onChange({ tooltipFormat: e.target.value })}
        />
      </Section>
    </React.Fragment>
  );
}

CounterValueOptions.propTypes = {
  disabled: PropTypes.bool,
  counterTypes: PropTypes.object,
  options: PropTypes.shape({
    type: PropTypes.string,
    column: PropTypes.string,
    rowNumber: PropTypes.number,
    displayFormat: PropTypes.string,
    showTooltip: PropTypes.bool,
    tooltipFormat: PropTypes.string,
  }).isRequired,
  data: PropTypes.shape({
    columns: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
      }).isRequired
    ),
  }).isRequired,
  onChange: PropTypes.func,
};

CounterValueOptions.defaultProps = {
  disabled: false,
  counterTypes: {},
  onChange: () => {},
};
