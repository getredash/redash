import { map } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import { react2angular } from "react2angular";
import { DataSource, Schema } from "@/components/proptypes";
import { Query } from "@/services/query";
import { QuerySnippet } from "@/services/query-snippet";
import { KeyboardShortcuts } from "@/services/keyboard-shortcuts";
import notification from "@/services/notification";
import localOptions from "@/lib/localOptions";

import EditorControl from "./EditorControl";
import { AceEditor, langTools, snippetsModule } from "./ace";
import { buildKeywordsFromSchema } from "./utils";
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
    listenForResize: PropTypes.func.isRequired,
    listenForEditorCommand: PropTypes.func.isRequired,
  };

  static defaultProps = {
    schema: null,
    dataSource: {},
    dataSources: [],
  };

  constructor(props) {
    super(props);

    this.refEditor = React.createRef();

    this.state = {
      schema: null, // eslint-disable-line react/no-unused-state
      keywords: {
        table: [],
        column: [],
        tableColumn: [],
      },
      autocompleteQuery: localOptions.get("liveAutocomplete", true),
      liveAutocompleteDisabled: false,
      // XXX temporary while interfacing with angular
      queryText: props.queryText,
      selectedQueryText: null,
    };

    const schemaCompleter = {
      identifierRegexps: [/[a-zA-Z_0-9.\-\u00A2-\uFFFF]/],
      getCompletions: (state, session, pos, prefix, callback) => {
        const tableKeywords = this.state.keywords.table;
        const columnKeywords = this.state.keywords.column;
        const tableColumnKeywords = this.state.keywords.tableColumn;

        if (prefix.length === 0 || tableKeywords.length === 0) {
          callback(null, []);
          return;
        }

        if (prefix[prefix.length - 1] === ".") {
          const tableName = prefix.substring(0, prefix.length - 1);
          callback(null, tableKeywords.concat(tableColumnKeywords[tableName]));
          return;
        }
        callback(null, tableKeywords.concat(columnKeywords));
      },
    };

    langTools.setCompleters([
      langTools.snippetCompleter,
      langTools.keyWordCompleter,
      langTools.textCompleter,
      schemaCompleter,
    ]);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!nextProps.schema) {
      return {
        keywords: {
          table: [],
          column: [],
          tableColumn: [],
        },
        liveAutocompleteDisabled: false,
      };
    } else if (nextProps.schema !== prevState.schema) {
      const tokensCount = nextProps.schema.reduce((totalLength, table) => totalLength + table.columns.length, 0);
      return {
        schema: nextProps.schema,
        keywords: buildKeywordsFromSchema(nextProps.schema),
        liveAutocompleteDisabled: tokensCount > 5000,
      };
    }
    return null;
  }

  onLoad = editor => {
    // Release Cmd/Ctrl+L to the browser
    editor.commands.bindKey("Cmd+L", null);
    editor.commands.bindKey("Ctrl+P", null);
    editor.commands.bindKey("Ctrl+L", null);

    // Ignore Ctrl+P to open new parameter dialog
    editor.commands.bindKey({ win: "Ctrl+P", mac: null }, null);
    // Lineup only mac
    editor.commands.bindKey({ win: null, mac: "Ctrl+P" }, "golineup");
    editor.commands.bindKey({ win: "Ctrl+Shift+F", mac: "Cmd+Shift+F" }, this.formatQuery);

    // Reset Completer in case dot is pressed
    editor.commands.on("afterExec", e => {
      if (e.command.name === "insertstring" && e.args === "." && editor.completer) {
        editor.completer.showPopup(editor);
      }
    });

    QuerySnippet.query(snippets => {
      const snippetManager = snippetsModule.snippetManager;
      const m = {
        snippetText: "",
      };
      m.snippets = snippetManager.parseSnippetFile(m.snippetText);
      snippets.forEach(snippet => {
        m.snippets.push(snippet.getSnippet());
      });
      snippetManager.register(m.snippets || [], m.scope);
    });

    editor.focus();
    this.props.listenForResize(() => editor.resize());
    this.props.listenForEditorCommand((e, command, ...args) => {
      switch (command) {
        case "focus": {
          editor.focus();
          break;
        }
        case "paste": {
          const [text] = args;
          editor.session.doc.replace(editor.selection.getRange(), text);
          const range = editor.selection.getRange();
          this.props.updateQuery(editor.session.getValue());
          editor.selection.setRange(range);
          break;
        }
        default:
          break;
      }
    });
  };

  updateSelectedQuery = selection => {
    const { editor } = this.refEditor.current;
    const doc = editor.getSession().doc;
    const rawSelectedQueryText = doc.getTextRange(selection.getRange());
    const selectedQueryText = rawSelectedQueryText.length > 1 ? rawSelectedQueryText : null;
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

  componentDidUpdate = () => {
    // ANGULAR_REMOVE_ME  Work-around for a resizing issue, see https://github.com/getredash/redash/issues/3353
    const { editor } = this.refEditor.current;
    editor.resize();
  };

  render() {
    const modKey = KeyboardShortcuts.modKey;

    const isExecuteDisabled = this.props.queryExecuting || !this.props.canExecuteQuery;

    return (
      <section className="editor__wrapper" data-test="QueryEditor">
        <div className="editor__container" data-executing={this.props.queryExecuting ? "true" : null}>
          <AceEditor
            ref={this.refEditor}
            theme="textmate"
            mode={this.props.dataSource.syntax || "sql"}
            value={this.state.queryText}
            editorProps={{ $blockScrolling: Infinity }}
            width="100%"
            height="100%"
            setOptions={{
              behavioursEnabled: true,
              enableSnippets: true,
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: !this.state.liveAutocompleteDisabled && this.state.autocompleteQuery,
              autoScrollEditorIntoView: true,
            }}
            showPrintMargin={false}
            wrapEnabled={false}
            onLoad={this.onLoad}
            onPaste={this.onPaste}
            onChange={this.updateQuery}
            onSelectionChange={this.updateSelectedQuery}
          />
        </div>

        <EditorControl
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
