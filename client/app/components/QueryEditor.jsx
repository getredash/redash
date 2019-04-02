import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from 'antd/lib/tooltip';
import { react2angular } from 'react2angular';

import AceEditor from 'react-ace';
import ace from 'brace';
import notification from '@/services/notification';

import 'brace/ext/language_tools';
import 'brace/mode/json';
import 'brace/mode/python';
import 'brace/mode/sql';
import 'brace/mode/yaml';
import 'brace/theme/textmate';
import 'brace/ext/searchbox';

import { Query } from '@/services/query';
import { QuerySnippet } from '@/services/query-snippet';
import { KeyboardShortcuts } from '@/services/keyboard-shortcuts';

import localOptions from '@/lib/localOptions';
import AutocompleteToggle from '@/components/AutocompleteToggle';
import keywordBuilder from './keywordBuilder';
import { DataSource, Schema } from './proptypes';

import './QueryEditor.css';

const langTools = ace.acequire('ace/ext/language_tools');
const snippetsModule = ace.acequire('ace/snippets');

// By default Ace will try to load snippet files for the different modes and fail.
// We don't need them, so we use these placeholders until we define our own.
function defineDummySnippets(mode) {
  ace.define(`ace/snippets/${mode}`, ['require', 'exports', 'module'], (require, exports) => {
    exports.snippetText = '';
    exports.scope = mode;
  });
}

defineDummySnippets('python');
defineDummySnippets('sql');
defineDummySnippets('json');
defineDummySnippets('yaml');

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
    canExecuteQuery: PropTypes.func.isRequired,
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
      autocompleteQuery: localOptions.get('liveAutocomplete', true),
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

        if (prefix[prefix.length - 1] === '.') {
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
        keywords: keywordBuilder.buildKeywordsFromSchema(nextProps.schema),
        liveAutocompleteDisabled: tokensCount > 5000,
      };
    }
    return null;
  }

  onLoad = (editor) => {
    // Release Cmd/Ctrl+L to the browser
    editor.commands.bindKey('Cmd+L', null);
    editor.commands.bindKey('Ctrl+P', null);
    editor.commands.bindKey('Ctrl+L', null);

    // Ignore Ctrl+P to open new parameter dialog
    editor.commands.bindKey({ win: 'Ctrl+P', mac: null }, null);
    // Lineup only mac
    editor.commands.bindKey({ win: null, mac: 'Ctrl+P' }, 'golineup');

    // Reset Completer in case dot is pressed
    editor.commands.on('afterExec', (e) => {
      if (e.command.name === 'insertstring' && e.args === '.'
          && editor.completer) {
        editor.completer.showPopup(editor);
      }
    });

    QuerySnippet.query((snippets) => {
      const snippetManager = snippetsModule.snippetManager;
      const m = {
        snippetText: '',
      };
      m.snippets = snippetManager.parseSnippetFile(m.snippetText);
      snippets.forEach((snippet) => {
        m.snippets.push(snippet.getSnippet());
      });
      snippetManager.register(m.snippets || [], m.scope);
    });

    editor.focus();
    this.props.listenForResize(() => editor.resize());
    this.props.listenForEditorCommand((e, command, ...args) => {
      switch (command) {
        case 'focus': {
          editor.focus();
          break;
        }
        case 'paste': {
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

  updateSelectedQuery = (selection) => {
    const { editor } = this.refEditor.current;
    const doc = editor.getSession().doc;
    const rawSelectedQueryText = doc.getTextRange(selection.getRange());
    const selectedQueryText = (rawSelectedQueryText.length > 1) ? rawSelectedQueryText : null;
    this.setState({ selectedQueryText });
    this.props.updateSelectedQuery(selectedQueryText);
  };

  updateQuery = (queryText) => {
    this.props.updateQuery(queryText);
    this.setState({ queryText });
  };

  formatQuery = () => {
    Query.format(this.props.dataSource.syntax || 'sql', this.props.queryText)
      .then(this.updateQuery)
      .catch(error => notification.error(error));
  };

  toggleAutocomplete = (state) => {
    this.setState({ autocompleteQuery: state });
    localOptions.set('liveAutocomplete', state);
  };

  componentDidUpdate = () => {
    // ANGULAR_REMOVE_ME  Work-around for a resizing issue, see https://github.com/getredash/redash/issues/3353
    const { editor } = this.refEditor.current;
    editor.resize();
  };

  render() {
    const modKey = KeyboardShortcuts.modKey;

    const isExecuteDisabled = this.props.queryExecuting || !this.props.canExecuteQuery();

    return (
      <section style={{ height: '100%' }} data-test="QueryEditor">
        <div className="container p-15 m-b-10" style={{ height: '100%' }}>
          <div data-executing={this.props.queryExecuting} style={{ height: 'calc(100% - 40px)', marginBottom: '0px' }} className="editor__container">
            <AceEditor
              ref={this.refEditor}
              theme="textmate"
              mode={this.props.dataSource.syntax || 'sql'}
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

          <div className="editor__control">
            <div className="form-inline d-flex">
              <Tooltip
                placement="top"
                title={<span>Add New Parameter (<i>{modKey} + P</i>)</span>}
              >
                <button type="button" className="btn btn-default m-r-5" onClick={this.props.addNewParameter}>
                  &#123;&#123;&nbsp;&#125;&#125;
                </button>
              </Tooltip>
              <Tooltip placement="top" title="Format Query">
                <button type="button" className="btn btn-default m-r-5" onClick={this.formatQuery}>
                  <span className="zmdi zmdi-format-indent-increase" />
                </button>
              </Tooltip>
              <AutocompleteToggle
                state={this.state.autocompleteQuery}
                onToggle={this.toggleAutocomplete}
                disabled={this.state.liveAutocompleteDisabled}
              />
              <select
                className="form-control datasource-small flex-fill w-100"
                onChange={this.props.updateDataSource}
                disabled={!this.props.isQueryOwner}
              >
                {this.props.dataSources.map(ds => (
                  <option label={ds.name} value={ds.id} key={`ds-option-${ds.id}`}>
                    {ds.name}
                  </option>
                ))}
              </select>
              {this.props.canEdit ? (
                <Tooltip placement="top" title={modKey + ' + S'}>
                  <button
                    type="button"
                    className="btn btn-default m-l-5"
                    onClick={this.props.saveQuery}
                    data-test="SaveButton"
                    title="Save"
                  >
                    <span className="fa fa-floppy-o" />
                    <span className="hidden-xs m-l-5">Save</span>
                    {this.props.isDirty ? '*' : null}
                  </button>
                </Tooltip>
              ) : null}
              <Tooltip placement="top" title={modKey + ' + Enter'}>
                {/*
                  Tooltip wraps disabled buttons with `<span>` and moves all styles
                  and classes to that `<span>`. There is a piece of CSS that fixes
                  button appearance, but also wwe need to add `disabled` class to
                  disabled buttons so it will be assigned to wrapper and make it
                  looking properly
                */}
                <button
                  type="button"
                  className={'btn btn-primary m-l-5' + (isExecuteDisabled ? ' disabled' : '')}
                  disabled={isExecuteDisabled}
                  onClick={this.props.executeQuery}
                  data-test="ExecuteButton"
                >
                  <span className="zmdi zmdi-play" />
                  <span className="hidden-xs m-l-5">{ (this.state.selectedQueryText == null) ? 'Execute' : 'Execute Selected' }</span>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </section>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('queryEditor', react2angular(QueryEditor));
}

init.init = true;
