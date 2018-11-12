import React from 'react';
import { react2angular } from 'react2angular';
import PropTypes from 'prop-types';
import { Collapse } from 'antd';

import { Schema } from '../proptypes';

const isSchemaEmpty = schema => schema === undefined || !schema.length;
const Panel = Collapse.Panel;

const doesTableContainSearchTerm = (searchTerm, columns) => {
  const regEx = new RegExp(searchTerm, 'g');
  const resultColumns = columns.filter(column => regEx.test(column));
  return !!resultColumns.length;
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
      schema: [],
      schemaInitialized: false,
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.schema && (prevState.schema.length !== this.props.schema.length)) {
      // setState() is fine here within the right conditions.
      // eslint-disable-next-line
      if (!this.state.schemaInitialized) this.setState({ schema: this.props.schema });
    }
  }

  doCopy(evt, hierarchy) {
    this.props.$rootScope.$broadcast('query-editor.command', 'paste', hierarchy.join('.'));
    evt.stopPropagation();
  }

  doSearch = (evt) => {
    if (!evt.target.value) return;
    const schema = this.props.schema.filter(table => doesTableContainSearchTerm(evt.target.value, table.columns));
    this.setState({ schema, schemaInitialized: true });
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
            onChange={this.doSearch}
          />
          <button
            className="btn btn-default"
            title="Refresh Schema"
            onClick={this.props.doRefresh}
          >
            <span className="zmdi zmdi-refresh" />
          </button>
        </div>
        <Collapse className="schema-browser">
          {this.state.schema.map((table) => {
            const copyElm = (
              <div>
                {table.name}{' '}
                <i
                  onClick={(evt) => { this.doCopy(evt, [table.name]); }}
                  aria-hidden="true"
                  className="fa fa-angle-double-right copy-to-editor"
                />
              </div>
            );
            return (
              <Panel key={table.name} header={copyElm}>
                {table.columns.map(column => (
                  <div className="table-open" key={column}>
                    {column}
                    <i
                      className="fa fa-angle-double-right copy-to-editor"
                      aria-hidden="true"
                      onClick={(evt) => { this.doCopy(evt, [column]); }}
                    />
                  </div>
                ))}
              </Panel>
            );
          })}
        </Collapse>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('schemaBrowser', react2angular(SchemaBrowser, null, ['$rootScope']));
}
