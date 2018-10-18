import { find, isFunction, isNull, isUndefined } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';

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
  };

  static defaultProps = {
    value: null,
    queryId: null,
    onSelect: () => {},
  };

  constructor(props) {
    super(props);
    this.state = {
      options: [],
    };
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
      Query.resultById({ id: queryId }, (result) => {
        if (this.props.queryId === queryId) {
          const options = optionsFromQueryResult(result.query_result);
          this.setState({ options });

          const found = find(options, option => option.value === this.props.value) !== undefined;
          if (!found && isFunction(this.props.onSelect)) {
            this.props.onSelect(options[0].value);
          }
        }
      });
    }
  }

  render() {
    return (
      <span>
        <select
          className="form-control"
          disabled={this.state.options.length === 0}
          value={isNull(this.props.value) || isUndefined(this.props.value) ? '' : this.props.value}
          onChange={event => this.props.onSelect(event.target.value)}
        >
          {this.state.options.map(option => (
            <option value={option.value} key={option.value}>{option.name}</option>
          ))}
        </select>
      </span>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('queryBasedParameterInput', react2angular(QueryBasedParameterInput, null, ['Query']));
}
