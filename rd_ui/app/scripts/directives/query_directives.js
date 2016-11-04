(function() {
  'use strict'

  function queryLink() {
    return {
      restrict: 'E',
      scope: {
        'query': '=',
        'visualization': '=?'
      },
      template: '<a ng-href="{{link}}" class="query-link">{{query.name}}</a>',
      link: function(scope, element) {
        var hash = null;
        if (scope.visualization) {
          if (scope.visualization.type === 'TABLE') {
            // link to hard-coded table tab instead of the (hidden) visualization tab
            hash = 'table';
          } else {
            hash = scope.visualization.id;
          }
        }
        scope.link = scope.query.getUrl(false, hash);
      }
    }
  }

  function querySourceLink($location) {
    return {
      restrict: 'E',
      template: '<span ng-show="query.id && canViewSource">\
                    <a ng-show="!sourceMode"\
                      ng-href="{{query.getUrl(true, selectedTab)}}" class="btn btn-default">Show Source\
                    </a>\
                    <a ng-show="sourceMode"\
                      ng-href="{{query.getUrl(false, selectedTab)}}" class="btn btn-default">Hide Source\
                    </a>\
                </span>'
    }
  }

  function queryResultLink() {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {

        var fileType = attrs.fileType ? attrs.fileType : "csv";
        scope.$watch('queryResult && queryResult.getData()', function(data) {
          if (!data) {
            return;
          }

          if (scope.queryResult.getId() == null) {
            element.attr('href', '');
          } else {
            element.attr('href', 'api/queries/' + scope.query.id + '/results/' + scope.queryResult.getId() + '.' + fileType + (scope.embed ? '?api_key=' + scope.api_key : ''));
            element.attr('download', scope.query.name.replace(" ", "_") + moment(scope.queryResult.getUpdatedAt()).format("_YYYY_MM_DD") + "." + fileType);
          }
        });
      }
    }
  }

  // By default Ace will try to load snippet files for the different modes and fail. We don't need them, so we use these
  // placeholders until we define our own.
  function defineDummySnippets(mode) {
    ace.define("ace/snippets/" + mode, ["require", "exports", "module"], function(require, exports, module) {
      "use strict";

      exports.snippetText = "";
      exports.scope = mode;
    });
  };

  defineDummySnippets("python");
  defineDummySnippets("sql");
  defineDummySnippets("json");

  function queryEditor(QuerySnippet) {
    return {
      restrict: 'E',
      scope: {
        'query': '=',
        'lock': '=',
        'schema': '=',
        'syntax': '='
      },
      template: '<div ui-ace="editorOptions" ng-model="query.query"></div>',
      link: {
        pre: function ($scope, element) {
          $scope.syntax = $scope.syntax || 'sql';

          $scope.editorOptions = {
            mode: 'json',
            require: ['ace/ext/language_tools'],
            advanced: {
              behavioursEnabled: true,
              enableSnippets: true,
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              autoScrollEditorIntoView: true,
            },
            onLoad: function(editor) {
              QuerySnippet.query(function(snippets) {
                var snippetManager = ace.require("ace/snippets").snippetManager;
                var m = {
                  snippetText: ''
                };
                m.snippets = snippetManager.parseSnippetFile(m.snippetText);
                _.each(snippets, function(snippet) {
                  m.snippets.push(snippet.getSnippet());
                });

                snippetManager.register(m.snippets || [], m.scope);
              });

              editor.$blockScrolling = Infinity;
              editor.getSession().setUseWrapMode(true);
              editor.setShowPrintMargin(false);

              $scope.$watch('syntax', function(syntax) {
                var newMode = 'ace/mode/' + syntax;
                editor.getSession().setMode(newMode);
              });

              $scope.$watch('schema', function(newSchema, oldSchema) {
                if (newSchema !== oldSchema) {
                  var tokensCount = _.reduce(newSchema, function(totalLength, table) { return totalLength + table.columns.length }, 0);
                  // If there are too many tokens we disable live autocomplete, as it makes typing slower.
                  if (tokensCount > 5000) {
                    editor.setOption('enableLiveAutocompletion', false);
                  } else {
                    editor.setOption('enableLiveAutocompletion', true);
                  }
                }

              });

              $scope.$parent.$on("angular-resizable.resizing", function (event, args) {
                editor.resize();
              });

              editor.focus();
            }
          };

          var langTools = ace.require("ace/ext/language_tools");

          var schemaCompleter = {
            getCompletions: function(state, session, pos, prefix, callback) {
              if (prefix.length === 0 || !$scope.schema) {
                callback(null, []);
                return;
              }

              if (!$scope.schema.keywords) {
                var keywords = {};

                _.each($scope.schema, function (table) {
                  keywords[table.name] = 'Table';

                  _.each(table.columns, function (c) {
                    keywords[c] = 'Column';
                    keywords[table.name + "." + c] = 'Column';
                  });
                });

                $scope.schema.keywords = _.map(keywords, function(v, k) {
                  return {
                    name: k,
                    value: k,
                    score: 0,
                    meta: v
                  };
                });
              }
              callback(null, $scope.schema.keywords);
            }
          };

          langTools.addCompleter(schemaCompleter);
        }
      }
    };
  }

  function queryFormatter($http, growl) {
    return {
      restrict: 'E',
      // don't create new scope to avoid ui-codemirror bug
      // seehttps://github.com/angular-ui/ui-codemirror/pull/37
      scope: false,
      template: '<button type="button" class="btn btn-default btn-s"\
                   ng-click="formatQuery()">\
                    <span class="zmdi zmdi-format-indent-increase"></span>\
                     Format Query\
                </button>',
      link: function($scope) {
        $scope.formatQuery = function formatQuery() {
          if ($scope.dataSource.syntax == 'json') {
            try {
              $scope.query.query = JSON.stringify(JSON.parse($scope.query.query), ' ', 4);
            } catch(err) {
              growl.addErrorMessage(err);
            }
          } else if ($scope.dataSource.syntax =='sql') {

            $scope.queryFormatting = true;
            $http.post('api/queries/format', {
              'query': $scope.query.query
            }).success(function (response) {
              $scope.query.query = response;
            }).finally(function () {
              $scope.queryFormatting = false;
            });
          } else {
            growl.addInfoMessage("Query formatting is not supported for your data source syntax.");
          }
        };
      }
    }
  }

  function schemaBrowser() {
    return {
      restrict: 'E',
      scope: {
        schema: '='
      },
      templateUrl: '/views/directives/schema_browser.html',
      link: function ($scope) {
        $scope.showTable = function(table) {
          table.collapsed = !table.collapsed;
          $scope.$broadcast('vsRepeatTrigger');
        }

        $scope.getSize = function(table) {
          var size = 18;

          if (!table.collapsed) {
            size += 18 * table.columns.length;
          }

          return size;
        }
      }
    }
  }

  function queryTimePicker() {
    return {
      restrict: 'E',
      template: '<select ng-disabled="refreshType != \'daily\'" ng-model="hour" ng-change="updateSchedule()" ng-options="c as c for c in hourOptions"></select> :\
                 <select ng-disabled="refreshType != \'daily\'" ng-model="minute" ng-change="updateSchedule()" ng-options="c as c for c in minuteOptions"></select>',
      link: function($scope) {
        var padWithZeros = function(size, v) {
          v = String(v);
          if (v.length < size) {
            v = "0" + v;
          }
          return v;
        };

        $scope.hourOptions = _.map(_.range(0, 24), _.partial(padWithZeros, 2));
        $scope.minuteOptions = _.map(_.range(0, 60, 5), _.partial(padWithZeros, 2));

        if ($scope.query.hasDailySchedule()) {
          var parts = $scope.query.scheduleInLocalTime().split(':');
          $scope.minute = parts[1];
          $scope.hour = parts[0];
        } else {
          $scope.minute = "15";
          $scope.hour = "00";
        }

        $scope.updateSchedule = function() {
          var newSchedule = moment().hour($scope.hour).minute($scope.minute).utc().format('HH:mm');
          if (newSchedule != $scope.query.schedule) {
            $scope.query.schedule = newSchedule;
            $scope.saveQuery();
          }
        };

        $scope.$watch('refreshType', function() {
          if ($scope.refreshType == 'daily') {
            $scope.updateSchedule();
          }
        });
      }
    }
  }

  function queryRefreshSelect() {
    return {
      restrict: 'E',
      template: '<select\
                  ng-disabled="refreshType != \'periodic\'"\
                  ng-model="query.schedule"\
                  ng-change="saveQuery()"\
                  ng-options="c.value as c.name for c in refreshOptions">\
                  <option value="">No Refresh</option>\
                  </select>',
      link: function($scope) {
        $scope.refreshOptions = [
            {
                value: "60",
                name: 'Every minute'
            }
        ];

        _.each([5, 10, 15, 30], function(i) {
          $scope.refreshOptions.push({
            value: String(i*60),
            name: "Every " + i + " minutes"
          })
        });

        _.each(_.range(1, 13), function (i) {
            $scope.refreshOptions.push({
                value: String(i * 3600),
                name: 'Every ' + i + 'h'
            });
        })

        $scope.refreshOptions.push({
            value: String(24 * 3600),
            name: 'Every 24h'
        });
        $scope.refreshOptions.push({
            value: String(7 * 24 * 3600),
            name: 'Every 7 days'
        });
        $scope.refreshOptions.push({
          value: String(14 * 24 * 3600),
          name: 'Every 14 days'
        });
        $scope.refreshOptions.push({
            value: String(30 * 24 * 3600),
            name: 'Every 30 days'
        });

        $scope.$watch('refreshType', function() {
          if ($scope.refreshType == 'periodic') {
            if ($scope.query.hasDailySchedule()) {
              $scope.query.schedule = null;
              $scope.saveQuery();
            }
          }
        });
      }

    }
  }

  angular.module('redash.directives')
  .directive('queryLink', queryLink)
  .directive('querySourceLink', ['$location', querySourceLink])
  .directive('queryResultLink', queryResultLink)
  .directive('queryEditor', ['QuerySnippet', queryEditor])
  .directive('queryRefreshSelect', queryRefreshSelect)
  .directive('queryTimePicker', queryTimePicker)
  .directive('schemaBrowser', schemaBrowser)
  .directive('queryFormatter', ['$http', 'growl', queryFormatter]);
})();
