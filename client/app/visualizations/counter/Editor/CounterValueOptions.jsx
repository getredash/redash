import { isNil, get, keys, map, includes } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import { Section, InputNumber, Input, Select, Checkbox } from "@/components/visualizations/editor";
import counterTypes from "../counterTypes";

export default function CounterValueOptions({ disabled, options, data, onChange }) {
  const additionalOptions = get(counterTypes, [options.type, "options"], []);

  return (
    <React.Fragment>
      <Section>
        <Select
          layout="horizontal"
          label="Type"
          className="w-100"
          disabled={disabled}
          defaultValue={options.type}
          onChange={type => onChange({ type })}>
          {map(counterTypes, ({ name }, type) => (
            <Select.Option key={type}>{name}</Select.Option>
          ))}
        </Select>
      </Section>

      {includes(additionalOptions, "column") && (
        <Section>
          <Select
            layout="horizontal"
            label="Column Name"
            className="w-100"
            disabled={disabled}
            allowClear
            placeholder="Select column..."
            defaultValue={isNil(options.column) ? undefined : options.column}
            onChange={column => onChange({ column: column || null })}>
            {map(data.columns, col => (
              <Select.Option key={col.name}>{col.name}</Select.Option>
            ))}
          </Select>
        </Section>
      )}

      {includes(additionalOptions, "rowNumber") && (
        <Section>
          <InputNumber
            layout="horizontal"
            label="Row Number"
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
          label="Display Format"
          className="w-100"
          disabled={disabled}
          defaultValue={options.displayFormat}
          onChange={e => onChange({ displayFormat: e.target.value })}
        />
      </Section>

      <Section>
        <Checkbox
          disabled={disabled}
          checked={options.showTooltip}
          onChange={e => onChange({ showTooltip: e.target.checked })}>
          Show Tooltip
        </Checkbox>
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label="Tooltip Format"
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
  options: PropTypes.shape({
    type: PropTypes.oneOf(keys(counterTypes)),
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
  onChange: () => {},
};
