import { map, reduce } from "lodash";
import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { react2angular } from "react2angular";
import { DataSource, Schema } from "@/components/proptypes";
import { Query } from "@/services/query";
import { KeyboardShortcuts } from "@/services/keyboard-shortcuts";
import { $rootScope } from "@/services/ng";
import notification from "@/services/notification";
import localOptions from "@/lib/localOptions";

import QueryEditorComponent from "./QueryEditorComponent";
import QueryEditorControls from "./QueryEditorControls";
import "./index.less";

function QueryEditor({
  queryText,
  schema,
  addNewParameter,
  dataSources,
  dataSource,
  canEdit,
  isDirty,
  isQueryOwner,
  updateDataSource,
  canExecuteQuery,
  executeQuery,
  queryExecuting,
  saveQuery,
  updateQuery,
  updateSelectedQuery,
  listenForEditorCommand,
}) {
  const editorRef = useRef(null);
  const autocompleteAvailable = useMemo(() => {
    const tokensCount = reduce(schema, (totalLength, table) => totalLength + table.columns.length, 0);
    return tokensCount <= 5000;
  }, [schema]);
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(localOptions.get("liveAutocomplete", true));
  const [selectedText, setSelectedText] = useState(null);

  useEffect(
    () =>
      // `listenForEditorCommand` returns function that removes event listener
      listenForEditorCommand((e, command, ...args) => {
        const editor = editorRef.current;
        if (editor) {
          switch (command) {
            case "focus": {
              editor.focus();
              break;
            }
            case "paste": {
              const [text] = args;
              editor.paste(text);
              $rootScope.$applyAsync();
              break;
            }
            default:
              break;
          }
        }
      }),
    [listenForEditorCommand]
  );

  const handleSelectionChange = useCallback(
    text => {
      setSelectedText(text);
      updateSelectedQuery(text);
    },
    [updateSelectedQuery]
  );

  const formatQuery = useCallback(() => {
    Query.format(dataSource.syntax || "sql", queryText)
      .then(updateQuery)
      .catch(error => notification.error(error));
  }, [dataSource.syntax, queryText, updateQuery]);

  const toggleAutocomplete = useCallback(state => {
    setAutocompleteEnabled(state);
    localOptions.set("liveAutocomplete", state);
  }, []);

  const modKey = KeyboardShortcuts.modKey;

  return (
    <section className="editor__wrapper" data-test="QueryEditor">
      <QueryEditorComponent
        ref={editorRef}
        data-executing={queryExecuting ? "true" : null}
        syntax={dataSource.syntax}
        value={queryText}
        schema={schema}
        autocompleteEnabled={autocompleteAvailable && autocompleteEnabled}
        onChange={updateQuery}
        onSelectionChange={handleSelectionChange}
      />

      <QueryEditorControls
        addParameterButtonProps={{
          title: (
            <React.Fragment>
              Add New Parameter (<i>{modKey} + P</i>)
            </React.Fragment>
          ),
          onClick: addNewParameter,
        }}
        formatButtonProps={{
          title: (
            <React.Fragment>
              Format Query (<i>{modKey} + Shift + F</i>)
            </React.Fragment>
          ),
          onClick: formatQuery,
        }}
        saveButtonProps={
          canEdit && {
            title: `${modKey} + S`,
            text: (
              <React.Fragment>
                <span className="hidden-xs">Save</span>
                {isDirty ? "*" : null}
              </React.Fragment>
            ),
            onClick: saveQuery,
          }
        }
        executeButtonProps={{
          title: `${modKey} + Enter`,
          disabled: !canExecuteQuery || queryExecuting,
          onClick: executeQuery,
          text: <span className="hidden-xs">{selectedText === null ? "Execute" : "Execute Selected"}</span>,
        }}
        autocompleteToggleProps={{
          available: autocompleteAvailable,
          enabled: autocompleteEnabled,
          onToggle: toggleAutocomplete,
        }}
        dataSourceSelectorProps={{
          disabled: !isQueryOwner,
          value: dataSource.id,
          onChange: updateDataSource,
          options: map(dataSources, ds => ({ value: ds.id, label: ds.name })),
        }}
      />
    </section>
  );
}

QueryEditor.propTypes = {
  queryText: PropTypes.string.isRequired,
  schema: Schema,
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

QueryEditor.defaultProps = {
  schema: null,
  dataSource: {},
  dataSources: [],
};

export default function init(ngModule) {
  ngModule.component("queryEditor", react2angular(QueryEditor));
}

init.init = true;
