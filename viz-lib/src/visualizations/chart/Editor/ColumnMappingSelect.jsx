import { isString, map, uniq, flatten, filter, sortBy, keys } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import { Section, Select } from "@/components/visualizations/editor";

const MappingTypes = {
  x: { label: "X Column" },
  y: { label: "Y Columns", multiple: true },
  series: { label: "Group by" },
  yError: { label: "Errors column" },
  size: { label: "Bubble Size Column" },
  zVal: { label: "Color Column" },
};

export default function ColumnMappingSelect({ value, availableColumns, type, onChange, isAxesInverted }) {
  const options = sortBy(filter(uniq(flatten([availableColumns, value])), v => isString(v) && v !== ""));
  let { label, multiple } = MappingTypes[type];
  // this inverts the ui, as the data will be inverted on render
  if (isAxesInverted) {
    if (type === "x") {
      label = label.replace("X", "Y");
    } else if (type === "y") {
      label = label.replace("Y", "X");
    }
  }

  return (
    <Section>
      <Select
        label={label}
        data-test={`Chart.ColumnMapping.${type}`}
        mode={multiple ? "multiple" : "default"}
        allowClear
        showSearch
        placeholder={multiple ? "Choose columns..." : "Choose column..."}
        value={value || undefined}
        onChange={column => onChange(column || null, type)}>
        {map(options, c => (
          <Select.Option key={c} value={c} data-test={`Chart.ColumnMapping.${type}.${c}`}>
            {c}
          </Select.Option>
        ))}
      </Select>
    </Section>
  );
}

ColumnMappingSelect.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  availableColumns: PropTypes.arrayOf(PropTypes.string),
  type: PropTypes.oneOf(keys(MappingTypes)),
  onChange: PropTypes.func,
};

ColumnMappingSelect.defaultProps = {
  value: null,
  availableColumns: [],
  type: null,
  onChange: () => {},
};

ColumnMappingSelect.MappingTypes = MappingTypes;
