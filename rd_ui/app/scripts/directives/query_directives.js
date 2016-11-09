(function() {
  'use strict'

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
