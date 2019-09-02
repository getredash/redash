import { find, isFunction, isArray, isEqual, toString, map, intersection } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Select from 'antd/lib/select';

const { Option } = Select;

export class QueryBasedParameterInput extends React.Component {
  static propTypes = {
    parameter: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    mode: PropTypes.oneOf(['default', 'multiple']),
    queryId: PropTypes.number,
    onSelect: PropTypes.func,
    className: PropTypes.string,
  };

  static defaultProps = {
    value: null,
    mode: 'default',
    parameter: null,
    queryId: null,
    onSelect: () => {},
    className: '',
  };

  constructor(props) {
    super(props);
    this.state = {
      options: [],
      loading: false,
    };
  }

  componentDidMount() {
    this._loadOptions(this.props.queryId);
  }

  componentDidUpdate(prevProps) {
    if (this.props.queryId !== prevProps.queryId) {
      this._loadOptions(this.props.queryId);
    }
  }

  async _loadOptions(queryId) {
    if (queryId && (queryId !== this.state.queryId)) {
      this.setState({ loading: true });
      const options = await this.props.parameter.loadDropdownValues();

      // stale queryId check
      if (this.props.queryId === queryId) {
        this.setState({ options, loading: false });

        if (this.props.mode === 'multiple' && isArray(this.props.value)) {
          const optionValues = map(options, option => option.value);
          const validValues = intersection(this.props.value, optionValues);
          if (!isEqual(this.props.value, validValues)) {
            this.props.onSelect(validValues);
          }
        } else {
          const found = find(options, option => option.value === this.props.value) !== undefined;
          if (!found && isFunction(this.props.onSelect)) {
            this.props.onSelect(options[0].value);
          }
        }
      }
    }
  }

  render() {
    const { className, value, mode, onSelect, ...otherProps } = this.props;
    const { loading, options } = this.state;
    return (
      <span>
        <Select
          className={className}
          disabled={loading || (options.length === 0)}
          loading={loading}
          mode={mode}
          value={isArray(value) ? value : toString(value)}
          onChange={onSelect}
          dropdownMatchSelectWidth={false}
          optionFilterProp="children"
          showSearch
          showArrow
          notFoundContent={null}
          {...otherProps}
        >
          {options.map(option => (<Option value={option.value} key={option.value}>{option.name}</Option>))}
        </Select>
      </span>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('queryBasedParameterInput', react2angular(QueryBasedParameterInput));
}

init.init = true;
