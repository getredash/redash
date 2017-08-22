import 'brace';
import 'brace/mode/python';
import 'brace/mode/sql';
import 'brace/mode/json';
import 'brace/ext/language_tools';
import { map } from 'underscore';

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

function queryEditor(QuerySnippet) {
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
            // Release Cmd/Ctrl+L to the browser
            editor.commands.bindKey('Cmd+L', null);
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
                const tokensCount =
                  newSchema.reduce((totalLength, table) => totalLength + table.columns.length, 0);
                // If there are too many tokens we disable live autocomplete,
                // as it makes typing slower.
                if (tokensCount > 5000) {
                  editor.setOption('enableLiveAutocompletion', false);
                } else {
                  editor.setOption('enableLiveAutocompletion', true);
                }
              }
            });

            $scope.$parent.$on('angular-resizable.resizing', () => {
              editor.resize();
            });

            editor.focus();
          },
        };

        function removeExtraSchemaInfo(data) {
          let newColumns = [];
          data.forEach((table) => {
            table.columns.forEach((column) => {
              if (column.charAt(column.length - 1) === ')') {
                let parensStartAt = column.indexOf('(') - 1;
                column = column.substring(0, parensStartAt);
                parensStartAt = 1; // linter complains without this line
              }
              // remove '[P] ' for partition keys
              if (column.charAt(0) === '[') {
                column = column.substring(4, column.length);
              }
              newColumns.push(column);
            });
            table.autoCompleteColumns = newColumns;
          });
          newColumns = []; // linter complains without this line
          return data;
        }

        const schemaCompleter = {
          getCompletions(state, session, pos, prefix, callback) {
            // make a variable for the auto completion in the query editor
            $scope.autoCompleteSchema = removeExtraSchemaInfo($scope.schema);

            if (prefix.length === 0 || !$scope.autoCompleteSchema) {
              callback(null, []);
              return;
            }

            if (!$scope.autoCompleteSchema.keywords) {
              const keywords = {};

              $scope.autoCompleteSchema.forEach((table) => {
                keywords[table.name] = 'Table';

                table.autoCompleteColumns.forEach((c) => {
                  keywords[c] = 'Column';
                  keywords[`${table.name}.${c}`] = 'Column';
                });
              });

              $scope.autoCompleteSchema.keywords = map(keywords, (v, k) =>
                 ({
                   name: k,
                   value: k,
                   score: 0,
                   meta: v,
                 })
              );
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

export default function (ngModule) {
  ngModule.directive('queryEditor', queryEditor);
}
