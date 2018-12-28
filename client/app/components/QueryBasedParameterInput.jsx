import { find, isFunction } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Select from 'antd/lib/select';

const { Option } = Select;

function optionsFromQueryResult(queryResult) {
  const columns = queryResult.data.columns;
  const numColumns = columns.length;
  let options = [];
  // If there are multiple columns, check if there is a column
  // named 'name' and column named 'value'. If name column is present
  // in results, use name from name column. Similar for value column.
  // Default: Use first string column for name and value.
  if (numColumns > 0) {
    let nameColumn = null;
    let valueColumn = null;
    columns.forEach((column) => {
      const columnName = column.name.toLowerCase();
      if (columnName === 'name') {
        nameColumn = column.name;
      }
      if (columnName === 'value') {
        valueColumn = column.name;
      }
      // Assign first string column as name and value column.
      if (nameColumn === null) {
        nameColumn = column.name;
      }
      if (valueColumn === null) {
        valueColumn = column.name;
      }
    });
    if (nameColumn !== null && valueColumn !== null) {
      options = queryResult.data.rows.map(row => ({
        name: row[nameColumn],
        value: row[valueColumn],
      }));
    }
  }
  return options;
}

export class QueryBasedParameterInput extends React.Component {
  static propTypes = {
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    queryId: PropTypes.number,
    onSelect: PropTypes.func,
    className: PropTypes.string,
  };

  static defaultProps = {
    value: null,
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

  // eslint-disable-next-line no-unused-vars
  componentWillReceiveProps(nextProps) {
    if (nextProps.queryId !== this.props.queryId) {
      this._loadOptions(nextProps.queryId, nextProps.value);
    }
  }

  _loadOptions(queryId) {
    if (queryId && (queryId !== this.state.queryId)) {
      const Query = this.props.Query; // eslint-disable-line react/prop-types
      this.setState({ loading: true });
      Query.resultById({ id: queryId }, (result) => {
        if (this.props.queryId === queryId) {
          const options = optionsFromQueryResult(result.query_result);
          this.setState({ options, loading: false });

          const found = find(options, option => option.value === this.props.value) !== undefined;
          if (!found && isFunction(this.props.onSelect)) {
            this.props.onSelect(options[0].value);
          }
        }
      });
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
          defaultValue={value}
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
  ngModule.component('queryBasedParameterInput', react2angular(QueryBasedParameterInput, null, ['Query']));
}

init.init = true;
