import { find, isFunction, toString } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Select from 'antd/lib/select';
import notification from '@/services/notification';

const { Option } = Select;

export class QueryBasedParameterInput extends React.Component {
  static propTypes = {
    parameter: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    queryId: PropTypes.number,
    onSelect: PropTypes.func,
    className: PropTypes.string,
    isDirty: PropTypes.bool,
  };

  static defaultProps = {
    value: null,
    parameter: null,
    queryId: null,
    onSelect: () => {},
    className: '',
    isDirty: false,
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

  async _fetchOptions() {
    try {
      return await this.props.parameter.loadDropdownValues(this.props.isDirty);
    } catch {
      if (this.props.isDirty) {
        notification.error('Cannot Fetch Dropdown Parameter Values', 'This query has other queries associated with it as dropdown parameters. ' +
        'In order to edit this query, you must have access to the associated queries.', { duration: 10 });
      }

      return [];
    }
  }

  async _loadOptions(queryId) {
    if (queryId && (queryId !== this.state.queryId)) {
      this.setState({ loading: true });
      const options = await this._fetchOptions();

      // stale queryId check
      if (this.props.queryId === queryId) {
        this.setState({ options, loading: false });

        const found = find(options, option => option.value === this.props.value) !== undefined;
        if (!found && isFunction(this.props.onSelect)) {
          this.props.onSelect(options[0].value);
        }
      }
    }
  }

  render() {
    const { className, value, onSelect } = this.props;
    const { loading, options } = this.state;
    return (
      <span>
        <Select
          className={className}
          disabled={loading || (options.length === 0)}
          loading={loading}
          value={toString(value)}
          onChange={onSelect}
          dropdownMatchSelectWidth={false}
          dropdownClassName="ant-dropdown-in-bootstrap-modal"
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
