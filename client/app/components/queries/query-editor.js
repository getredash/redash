import 'brace';
import 'brace/mode/python';
import 'brace/mode/sql';
import 'brace/mode/json';
import 'brace/ext/language_tools';
import 'brace/ext/searchbox';
import { map } from 'lodash';

// By default Ace will try to load snippet files for the different modes and fail.
// We don't need them, so we use these placeholders until we define our own.
function defineDummySnippets(mode) {
  window.ace.define(`ace/snippets/${mode}`, ['require', 'exports', 'module'], (require, exports) => {
    exports.snippetText = '';
    exports.scope = mode;
  });
}

defineDummySnippets('python');
defineDummySnippets('sql');
defineDummySnippets('json');

function queryEditor(QuerySnippet, $timeout) {
  return {
    restrict: 'E',
    scope: {
      query: '=',
      schema: '=',
      syntax: '=',
    },
    template: '<div ui-ace="editorOptions" ng-model="query.query"></div>',
    link: {
      pre($scope) {
        $scope.syntax = $scope.syntax || 'sql';

        $scope.editorOptions = {
          mode: 'json',
          // require: ['ace/ext/language_tools'],
          advanced: {
            behavioursEnabled: true,
            enableSnippets: true,
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            autoScrollEditorIntoView: true,
          },
          onLoad(editor) {
            $scope.$on('query-editor.command', ($event, command, ...args) => {
              switch (command) {
                case 'focus': {
                  editor.focus();
                  break;
                }
                case 'paste': {
                  const [text] = args;
                  editor.session.doc.replace(editor.selection.getRange(), text);
                  const range = editor.selection.getRange();
                  $scope.query.query = editor.session.getValue();
                  $timeout(() => {
                    editor.selection.setRange(range);
                  });
                  break;
                }
                default:
                  break;
              }
            });

            // Release Cmd/Ctrl+L to the browser
            editor.commands.bindKey('Cmd+L', null);
            editor.commands.bindKey('Ctrl+P', null);
            editor.commands.bindKey('Ctrl+L', null);

            QuerySnippet.query((snippets) => {
              window.ace.acequire(['ace/snippets'], (snippetsModule) => {
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
            });

            editor.$blockScrolling = Infinity;
            editor.getSession().setUseWrapMode(true);
            editor.setShowPrintMargin(false);

            $scope.$watch('syntax', (syntax) => {
              const newMode = `ace/mode/${syntax}`;
              editor.getSession().setMode(newMode);
            });

            $scope.$watch('autoCompleteSchema', (newSchema, oldSchema) => {
              if (newSchema !== oldSchema) {
                if (newSchema === undefined) {
                  return;
                }
                const tokensCount = newSchema.reduce((totalLength, table) => totalLength + table.columns.length, 0);
                // If there are too many tokens we disable live autocomplete,
                // as it makes typing slower.
                if (tokensCount > 5000) {
                  editor.setOption('enableLiveAutocompletion', false);
                  editor.setOption('enableBasicAutocompletion', false);
                } else {
                  editor.setOption('enableLiveAutocompletion', true);
                  editor.setOption('enableBasicAutocompletion', true);
                }
              }
            });

            $scope.$parent.$on('angular-resizable.resizing', () => {
              editor.resize();
            });

            editor.focus();
          },
        };

        const schemaCompleter = {
          getCompletions(state, session, pos, prefix, callback) {
            // make a variable for the auto completion in the query editor
            $scope.autoCompleteSchema = $scope.schema; // removeExtraSchemaInfo(

            if (prefix.length === 0 || !$scope.autoCompleteSchema) {
              callback(null, []);
              return;
            }

            if (!$scope.autoCompleteSchema.keywords) {
              const keywords = {};

              $scope.autoCompleteSchema.forEach((table) => {
                keywords[table.name] = 'Table';

                table.columns.forEach((c) => { // autoCompleteColumns
                  if (c.charAt(c.length - 1) === ')') {
                    let parensStartAt = c.indexOf('(') - 1;
                    c = c.substring(0, parensStartAt);
                    parensStartAt = 1; // linter complains without this line
                  }
                  // remove '[P] ' for partition keys
                  if (c.charAt(0) === '[') {
                    c = c.substring(4, c.length);
                  }
                  // keywords[c] = 'Column'; // dups columns
                  keywords[`${table.name}.${c}`] = 'Column';
                });
              });

              $scope.autoCompleteSchema.keywords = map(keywords, (v, k) =>
                ({
                  name: k,
                  value: k,
                  score: 0,
                  meta: v,
                }));
            }
            callback(null, $scope.autoCompleteSchema.keywords);
          },
        };

        window.ace.acequire(['ace/ext/language_tools'], (langTools) => {
          langTools.addCompleter(schemaCompleter);
        });
      },
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('queryEditor', queryEditor);
}
