import { isArray, indexOf, get, map, includes, every, some, toNumber } from "lodash";
import moment from "moment";
import React from "react";
import PropTypes from "prop-types";
import Select from "antd/lib/select";
import { formatColumnValue } from "@/lib/utils";

const ALL_VALUES = "###Redash::Filters::SelectAll###";
const NONE_VALUES = "###Redash::Filters::Clear###";

export const FilterType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  friendlyName: PropTypes.string.isRequired,
  multiple: PropTypes.bool,
  current: PropTypes.oneOfType([PropTypes.any, PropTypes.arrayOf(PropTypes.any)]),
  values: PropTypes.arrayOf(PropTypes.any).isRequired,
});

export const FiltersType = PropTypes.arrayOf(FilterType);

function createFilterChangeHandler(filters, onChange) {
  return (filter, values) => {
    if (isArray(values)) {
      values = map(values, value => filter.values[toNumber(value.key)] || value.key);
    } else {
      const _values = filter.values[toNumber(values.key)];
      values = _values !== undefined ? _values : values.key;
    }

    if (filter.multiple && includes(values, ALL_VALUES)) {
      values = [...filter.values];
    }
    if (filter.multiple && includes(values, NONE_VALUES)) {
      values = [];
    }
    filters = map(filters, f => (f.name === filter.name ? { ...filter, current: values } : f));
    onChange(filters);
  };
}

export function filterData(rows, filters = []) {
  if (!isArray(rows)) {
    return [];
  }

  let result = rows;

  if (isArray(filters) && filters.length > 0) {
    // "every" field's value should match "some" of corresponding filter's values
    result = result.filter(row =>
      every(filters, filter => {
        const rowValue = row[filter.name];
        const filterValues = isArray(filter.current) ? filter.current : [filter.current];
        return some(filterValues, filterValue => {
          if (moment.isMoment(rowValue)) {
            return rowValue.isSame(filterValue);
          }
          // We compare with either the value or the String representation of the value,
          // because Select2 casts true/false to "true"/"false".
          return filterValue === rowValue || String(rowValue) === filterValue;
        });
      })
    );
  }

  return result;
}

function Filters({ filters, onChange }) {
  if (filters.length === 0) {
    return null;
  }

  onChange = createFilterChangeHandler(filters, onChange);

  return (
    <div className="filters-wrapper">
      <div className="container bg-white">
        <div className="row">
          {map(filters, filter => {
            const options = map(filter.values, (value, index) => (
              <Select.Option key={index}>{formatColumnValue(value, get(filter, "column.type"))}</Select.Option>
            ));

            return (
              <div key={filter.name} className="col-sm-6 p-l-0 filter-container">
                <label>{filter.friendlyName}</label>
                {options.length === 0 && <Select className="w-100" disabled value="No values" />}
                {options.length > 0 && (
                  <Select
                    labelInValue
                    className="w-100"
                    mode={filter.multiple ? "multiple" : "default"}
                    value={
                      isArray(filter.current)
                        ? map(filter.current, value => ({
                            key: `${indexOf(filter.values, value)}`,
                            label: formatColumnValue(value),
                          }))
                        : { key: `${indexOf(filter.values, filter.current)}`, label: formatColumnValue(filter.current) }
                    }
                    allowClear={filter.multiple}
                    optionFilterProp="children"
                    showSearch
                    onChange={values => onChange(filter, values)}>
                    {!filter.multiple && options}
                    {filter.multiple && [
                      <Select.Option key={NONE_VALUES}>
                        <i className="fa fa-square-o m-r-5" />
                        Clear
                      </Select.Option>,
                      <Select.Option key={ALL_VALUES}>
                        <i className="fa fa-check-square-o m-r-5" />
                        Select All
                      </Select.Option>,
                      <Select.OptGroup key="Values" title="Values">
                        {options}
                      </Select.OptGroup>,
                    ]}
                  </Select>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Filters.propTypes = {
  filters: FiltersType.isRequired,
  onChange: PropTypes.func, // (name, value) => void
};

Filters.defaultProps = {
  onChange: () => {},
};

export default Filters;
