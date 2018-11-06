// XXX The filters stuff in query-results.js needs to be significantly reworked to be more react friendly
import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { isArray } from 'lodash';
import Select from 'antd/lib/select';

import { ClientConfig } from '@/components/proptypes';

const Filter = PropTypes.shape({
  current: PropTypes.array.isRequired,
  multiple: PropTypes.bool.isRequired,
  friendlyName: PropTypes.string.isRequired,
  values: PropTypes.arrayOf(PropTypes.string),
});

const multiPreamble = [{ value: '*', label: 'Select All' }, { value: '-', label: 'Clear' }];

export default class Filters extends React.Component {
  static Filter = Filter
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    filters: PropTypes.arrayOf(Filter).isRequired,
    clientConfig: ClientConfig.isRequired,
  }

  filterValue = (value, filter) => {
    let firstValue = value;
    if (isArray(value)) {
      firstValue = value[0];
    }

    if (filter.column.type === 'date') {
      if (firstValue && moment.isMoment(firstValue)) {
        firstValue = firstValue.format(this.props.clientConfig.dateFormat);
      }
    } else if (filter.column.type === 'datetime') {
      if (firstValue && moment.isMoment(firstValue)) {
        firstValue = firstValue.format(this.props.clientConfig.dateTimeFormat);
      }
    }

    return <Select.Option key={firstValue} value={firstValue}>{firstValue}</Select.Option>;
  }
  changeFilters = (change, i) => {
    const f = { ...this.props.filters[i] };
    if (f.multiple) {
      f.current = [...f.current, change];
    } else {
      f.current = [change];
    }
    const filters = Array.from(this.props.filters);
    filters[i] = f;
    this.props.onChange(filters);
  }

  render() {
    if (this.props.filters.length === 0) {
      return null;
    }

    return (
      <div className="parameter-container container bg-white">
        <div className="row">
          {this.props.filters.map((fi, i) => (
            <div key={fi.name} className="col-sm-6 p-l-0 filter-container">
              <label>{fi.friendlyName}</label>
              <br />
              <Select
                className="dropdown"
                id={'filter-' + fi.name}
                value={fi.current && (fi.multiple ? fi.current : fi.current[0])}
                mode={fi.multiple ? 'multiple' : 'default'}
                onChange={ch => this.changeFilters(ch, i)}
                placeholder={`Select value for ${fi.friendlyName}...`}
              >
                {(fi.multiple ? multiPreamble : []).concat(fi.values.map(v => this.filterValue(v, fi)))}
              </Select>
            </div>
          ))}
        </div>
      </div>

    );
  }
}
