import { map } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import { react2angular } from "react2angular";
import { DataSource, Schema } from "@/components/proptypes";
import { Query } from "@/services/query";
import { KeyboardShortcuts } from "@/services/keyboard-shortcuts";
import notification from "@/services/notification";
import localOptions from "@/lib/localOptions";

import QueryEditorComponent from "./QueryEditorComponent";
import QueryEditorControls from "./QueryEditorControls";
import "./index.less";

class QueryEditor extends React.Component {
  static propTypes = {
    queryText: PropTypes.string.isRequired,
    schema: Schema, // eslint-disable-line react/no-unused-prop-types
    addNewParameter: PropTypes.func.isRequired,
    dataSources: PropTypes.arrayOf(DataSource),
    dataSource: DataSource,
    canEdit: PropTypes.bool.isRequired,
    isDirty: PropTypes.bool.isRequired,
    isQueryOwner: PropTypes.bool.isRequired,
    updateDataSource: PropTypes.func.isRequired,
    canExecuteQuery: PropTypes.bool.isRequired,
    executeQuery: PropTypes.func.isRequired,
    queryExecuting: PropTypes.bool.isRequired,
    saveQuery: PropTypes.func.isRequired,
    updateQuery: PropTypes.func.isRequired,
    updateSelectedQuery: PropTypes.func.isRequired,
    listenForEditorCommand: PropTypes.func.isRequired,
  };

  static defaultProps = {
    schema: null,
    dataSource: {},
    dataSources: [],
  };

  constructor(props) {
    super(props);

    this.editorRef = React.createRef();

    this.state = {
      autocompleteQuery: localOptions.get("liveAutocomplete", true),
      // XXX temporary while interfacing with angular
      queryText: props.queryText,
      selectedQueryText: null,
    };

    this.props.listenForEditorCommand((e, command, ...args) => {
      const editor = this.editorRef.current;
      if (editor) {
        switch (command) {
          case "focus": {
            editor.focus();
            break;
          }
          case "paste": {
            const [text] = args;
            editor.paste(text);
            break;
          }
          default:
            break;
        }
      }
    });
  }

  updateSelectedQuery = selectedQueryText => {
    this.setState({ selectedQueryText });
    this.props.updateSelectedQuery(selectedQueryText);
  };

  updateQuery = queryText => {
    this.props.updateQuery(queryText);
    this.setState({ queryText });
  };

  formatQuery = () => {
    Query.format(this.props.dataSource.syntax || "sql", this.props.queryText)
      .then(this.updateQuery)
      .catch(error => notification.error(error));
  };

  toggleAutocomplete = state => {
    this.setState({ autocompleteQuery: state });
    localOptions.set("liveAutocomplete", state);
  };

  render() {
    const modKey = KeyboardShortcuts.modKey;

    const isExecuteDisabled = this.props.queryExecuting || !this.props.canExecuteQuery;

    return (
      <section className="editor__wrapper" data-test="QueryEditor">
        <QueryEditorComponent
          ref={this.editorRef}
          data-executing={this.props.queryExecuting ? "true" : null}
          syntax={this.props.dataSource.syntax}
          value={this.state.queryText}
          schema={this.props.schema}
          autocompleteEnabled={this.state.autocompleteQuery}
          onChange={this.updateQuery}
          onSelectionChange={this.updateSelectedQuery}
        />

        <QueryEditorControls
          addParameterButtonProps={{
            title: (
              <React.Fragment>
                Add New Parameter (<i>{modKey} + P</i>)
              </React.Fragment>
            ),
            onClick: this.props.addNewParameter,
          }}
          formatButtonProps={{
            title: (
              <React.Fragment>
                Format Query (<i>{modKey} + Shift + F</i>)
              </React.Fragment>
            ),
            onClick: this.formatQuery,
          }}
          saveButtonProps={
            this.props.canEdit && {
              title: `${modKey} + S`,
              text: (
                <React.Fragment>
                  <span className="hidden-xs">Save</span>
                  {this.props.isDirty ? "*" : null}
                </React.Fragment>
              ),
              onClick: this.props.saveQuery,
            }
          }
          executeButtonProps={{
            title: `${modKey} + Enter`,
            disabled: isExecuteDisabled,
            onClick: this.props.executeQuery,
            text: (
              <span className="hidden-xs">{this.state.selectedQueryText == null ? "Execute" : "Execute Selected"}</span>
            ),
          }}
          autocompleteToggleProps={{
            available: !this.state.liveAutocompleteDisabled,
            enabled: this.state.autocompleteQuery,
            onToggle: this.toggleAutocomplete,
          }}
          dataSourceSelectorProps={{
            disabled: !this.props.isQueryOwner,
            value: this.props.dataSource.id,
            onChange: this.props.updateDataSource,
            options: map(this.props.dataSources, ds => ({ value: ds.id, label: ds.name })),
          }}
        />
      </section>
    );
  }
}

export default function init(ngModule) {
  ngModule.component("queryEditor", react2angular(QueryEditor));
}

init.init = true;
