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
            element.attr('href', 'api/queries/' + scope.query.id + '/results/' + scope.queryResult.getId() + '.' + fileType);
            element.attr('download', scope.query.name.replace(" ", "_") + moment(scope.queryResult.getUpdatedAt()).format("_YYYY_MM_DD") + "." + fileType);
          }
        });
      }
    }
  }

  function queryEditor() {
    return {
      restrict: 'E',
      scope: {
        'query': '=',
        'lock': '=',
        'schema': '=',
        'syntax': '='
      },
      template: '<textarea></textarea>',
      link: {
        pre: function ($scope, element) {
          $scope.syntax = $scope.syntax || 'sql';

          var modes = {
            'sql': 'text/x-sql',
            'python': 'text/x-python',
            'json': 'application/json'
          };

          var textarea = element.children()[0];
          var editorOptions = {
            mode: modes[$scope.syntax],
            lineWrapping: true,
            lineNumbers: true,
            readOnly: false,
            matchBrackets: true,
            autoCloseBrackets: true,
            extraKeys: {"Ctrl-Space": "autocomplete"}
          };

          var additionalHints = [];

          CodeMirror.commands.autocomplete = function(cm) {
            var hinter  = function(editor, options) {
              var hints = CodeMirror.hint.anyword(editor, options);
              var cur = editor.getCursor(), token = editor.getTokenAt(cur).string;

              hints.list = _.union(hints.list, _.filter(additionalHints, function (h) {
                return h.search(token) === 0;
              }));

              return hints;
            };

//            CodeMirror.showHint(cm, CodeMirror.hint.anyword);
            CodeMirror.showHint(cm, hinter);
          };

          var codemirror = CodeMirror.fromTextArea(textarea, editorOptions);

          codemirror.on('change', function(instance) {
            var newValue = instance.getValue();

            if (newValue !== $scope.query.query) {
              $scope.$evalAsync(function() {
                $scope.query.query = newValue;
              });
            }
          });

          $scope.$watch('query.query', function () {
            if ($scope.query.query !== codemirror.getValue()) {
              codemirror.setValue($scope.query.query);
            }
          });

          $scope.$watch('schema', function (schema) {
            if (schema) {
              var keywords = [];
              _.each(schema, function (table) {
                keywords.push(table.name);
                _.each(table.columns, function (c) {
                  keywords.push(c);
                });
              });

              additionalHints = _.unique(keywords);
            }

            codemirror.refresh();
          });

          $scope.$watch('syntax', function(syntax) {
            codemirror.setOption('mode', modes[syntax]);
          });

          $scope.$watch('lock', function (locked) {
            var readOnly = locked ? 'nocursor' : false;
            codemirror.setOption('readOnly', readOnly);
          });
        }
      }
    };
  }

  function queryFormatter($http) {
    return {
      restrict: 'E',
      // don't create new scope to avoid ui-codemirror bug
      // seehttps://github.com/angular-ui/ui-codemirror/pull/37
      scope: false,
      template: '<button type="button" class="btn btn-default btn-s"\
                   ng-click="formatQuery()">\
                    <span class="zmdi zmdi-format-indent-increase"></span>\
                     Format SQL\
                </button>',
      link: function($scope) {
        $scope.formatQuery = function formatQuery() {
            $scope.queryFormatting = true;
            $http.post('api/queries/format', {
                'query': $scope.query.query
            }).success(function (response) {
                $scope.query.query = response;
            }).finally(function () {
              $scope.queryFormatting = false;
            });
        };
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
            name: 'Once a week'
        });
        $scope.refreshOptions.push({
            value: String(30 * 24 * 3600),
            name: 'Every 30d'
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
  .directive('queryEditor', queryEditor)
  .directive('queryRefreshSelect', queryRefreshSelect)
  .directive('queryTimePicker', queryTimePicker)
  .directive('queryFormatter', ['$http', queryFormatter]);
})();
