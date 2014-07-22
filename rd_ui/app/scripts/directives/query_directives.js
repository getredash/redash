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
            $scope.queryExecuting = true;
            $http.post('/api/queries/format', {
                'query': $scope.query.query
            }).success(function (response) {
                $scope.query.query = response;
            }).finally(function () {
              $scope.queryExecuting = false;
            });
        };
      }
    }
  }

  function queryRefreshSelect() {
    return {
      restrict: 'E',
      template: '<select\
                  ng-disabled="!isQueryOwner"\
                  ng-model="query.ttl"\
                  ng-change="saveQuery()"\
                  ng-options="c.value as c.name for c in refreshOptions">\
                  </select>',
      link: function($scope) {
        $scope.refreshOptions = [
            {
                value: -1,
                name: 'No Refresh'
            },
            {
                value: 60 * 15,
                name: 'Every 15mins'
            },
        ]

        _.each(_.range(1, 13), function (i) {
            $scope.refreshOptions.push({
                value: i * 3600,
                name: 'Every ' + i + 'h'
            });
        })

        $scope.refreshOptions.push({
            value: 24 * 3600,
            name: 'Every 24h'
        });
        $scope.refreshOptions.push({
            value: 7 * 24 * 3600,
            name: 'Once a week'
        });
      }

    }
  }

  angular.module('redash.directives')
  .directive('queryLink', queryLink)
  .directive('querySourceLink', querySourceLink)
  .directive('queryEditor', queryEditor)
  .directive('queryRefreshSelect', queryRefreshSelect)
  .directive('queryFormatter', ['$http', queryFormatter]);
})();