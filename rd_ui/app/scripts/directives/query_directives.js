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
        scope.link = '/queries/' + scope.query.id;
        if (scope.visualization) {
          if (scope.visualization.type === 'TABLE') {
            // link to hard-coded table tab instead of the (hidden) visualization tab
            scope.link += '#table';
          } else {
            scope.link += '#' + scope.visualization.id;
          }
        }
        // element.find('a').attr('href', link);
      }
    }
  }

  function querySourceLink() {
    return {
      restrict: 'E',
      template: '<span ng-show="query.id && canViewSource">\
                    <a ng-show="!sourceMode"\
                      ng-href="{{query.id}}/source#{{selectedTab}}">Show Source\
                    </a>\
                    <a ng-show="sourceMode"\
                      ng-href="/queries/{{query.id}}#{{selectedTab}}">Hide Source\
                    </a>\
                </span>'
    }
  }

  function queryResultCSVLink() {
    return {
      restrict: 'A',
      link: function (scope, element) {
        scope.$watch('queryResult && queryResult.getData()', function(data) {
          if (!data) {
            return;
          }

          if (scope.queryResult.getId() == null) {
            element.attr('href', '');
          } else {
            element.attr('href', '/api/queries/' + scope.query.id + '/results/' + scope.queryResult.getId() + '.csv');
            element.attr('download', scope.query.name.replace(" ", "_") + moment(scope.queryResult.getUpdatedAt()).format("_YYYY_MM_DD") + ".csv");
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
        'lock': '='
      },
      template: '<textarea\
                  ui-codemirror="editorOptions"\
                  ng-model="query.query">',
      link: function($scope) {
        $scope.editorOptions = {
            mode: 'text/x-sql',
            lineWrapping: true,
            lineNumbers: true,
            readOnly: false,
            matchBrackets: true,
            autoCloseBrackets: true
        };

        $scope.$watch('lock', function(locked) {
          $scope.editorOptions.readOnly = locked ? 'nocursor' : false;
        });
      }
    }
  }

  function queryFormatter($http) {
    return {
      restrict: 'E',
      // don't create new scope to avoid ui-codemirror bug
      // seehttps://github.com/angular-ui/ui-codemirror/pull/37
      scope: false,
      template: '<button type="button" class="btn btn-default btn-xs"\
                   ng-click="formatQuery()">\
                    <span class="glyphicon glyphicon-indent-left"></span>\
                     Format SQL\
                </button>',
      link: function($scope) {
        $scope.formatQuery = function formatQuery() {
            $scope.queryFormatting = true;
            $http.post('/api/queries/format', {
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
        ]

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
  .directive('querySourceLink', querySourceLink)
  .directive('queryResultLink', queryResultCSVLink)
  .directive('queryEditor', queryEditor)
  .directive('queryRefreshSelect', queryRefreshSelect)
  .directive('queryTimePicker', queryTimePicker)
  .directive('queryFormatter', ['$http', queryFormatter]);
})();