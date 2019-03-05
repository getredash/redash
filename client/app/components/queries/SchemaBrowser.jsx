import React from 'react';
import { react2angular } from 'react2angular';
import PropTypes from 'prop-types';
import { Icon } from 'antd';
import { debounce } from 'lodash';
import { $rootScope } from '@/services/ng';

import { Schema } from '../proptypes';

const isSchemaEmpty = schema => schema === undefined || !schema.length;

// Return true if the search term is contained within the table name
// or any of the table's columns.
const doesTableContainSearchTerm = (searchTerm, table) => {
  const regEx = new RegExp(searchTerm, 'gi');

  // If the table name matches the search term we can return early.
  if (regEx.test(table.name)) return true;

  return !!table.columns.filter(column => regEx.test(column)).length;
};

const doCopy = (evt, hierarchy) => {
  // eslint-disable-next-line
  $rootScope.$broadcast('query-editor.command', 'paste', hierarchy.join('.'));
  evt.stopPropagation();
};

class SchemaBrowser extends React.Component {
  static propTypes = {
    schema: Schema, // eslint-disable-line react/no-unused-prop-types
    doRefresh: PropTypes.func.isRequired,
  };

  static defaultProps = {
    schema: null,
  };

  constructor(props) {
    super(props);

    this.state = {
      searchTerm: '',
      schema: [],
      schemaInitialized: false,
    };

    // Candidate to be abstracted out to a set of config constants.
    // Performs search filtering after the number of milliseconds set below.
    this.doSearch = debounce(this.doSearch, 150);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.schema && (this.props.schema && prevState.schema.length !== this.props.schema.length)) {
      // setState() is fine here within the right conditions.
      // eslint-disable-next-line
      if (!this.state.schemaInitialized) this.setState({ schema: this.props.schema });
    }
  }

  handleSearch = (evt) => {
    if (!evt.target.value) {
      this.setState({ schema: this.props.schema, searchTerm: '' });
      return;
    }
    this.setState({ searchTerm: evt.target.value });
    this.doSearch(evt.target.value);
  }

  doSearch = (searchTerm) => {
    const schema = this.props.schema.filter(table => doesTableContainSearchTerm(searchTerm, table));
    this.setState({ searchTerm, schema });
  }

  getTitleElement = (title, isTableRow) => (
    <span className="schema-browser-title-item">
      {isTableRow && <Icon type="table" />}
      <span>{` ${title} `}</span>
      <Icon
        onClick={(evt) => { doCopy(evt, [title]); }}
        aria-hidden="true"
        type="double-right"
        className="copy-arrow"
      />
    </span>
  );

  doRowToggle = ({ target }) => {
    target.closest('.table-item').classList.toggle('schema-table-expanded');
  }

  render() {
    if (!this.props.schema) {
      return null;
    }
    return (
      <div className="schema-container">
        <div className="schema-control">
          <input
            type="text"
            placeholder="Search schema..."
            className="form-control"
            disabled={isSchemaEmpty(this.props.schema)}
            value={this.state.searchTerm}
            onChange={this.handleSearch}
          />
          <button
            className="btn btn-default"
            title="Refresh Schema"
            type="button"
            onClick={this.props.doRefresh}
          >
            <span className="zmdi zmdi-refresh" />
          </button>
        </div>
        <div className="schema-browser">
          {this.state.schema.map(table => (
            <div key={table.name} className="table-item">
              <div className="table-name" onClick={this.doRowToggle}>{this.getTitleElement(table.name, true)}</div>
              {table.columns.map(column => (
                <div className="table-open" key={column}>{this.getTitleElement(column)}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('schemaBrowser', react2angular(SchemaBrowser));
}

init.init = true;
