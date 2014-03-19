(function () {
    'use strict';

    function QueryEditCtrl($controller, $scope, $window, $route, $http, $location, growl, notifications, Query, Visualization) {
        var pristineHash = "";
        var leavingPageText = "You will lose your changes if you leave";

        // controller inheritance
        $controller('QueryViewCtrl', {$scope: $scope});

        $scope.sourceMode = true;

        $scope.dirty = undefined;
        $scope.isNewQuery = false;

        $scope.canEdit = currentUser.canEdit($scope.query);

        $scope.newVisualization = undefined;

        $window.onbeforeunload = function () {
            if ($scope.canEdit && $scope.dirty) {
                return leavingPageText;
            }
        }

        function getQuerySourceUrl(queryId) {
            return '/queries/' + queryId + '/source#' + $location.hash();
        };

        Mousetrap.bindGlobal("meta+s", function (e) {
            e.preventDefault();

            if ($scope.canEdit) {
                $scope.saveQuery();
            }
        });

        $scope.$on('$locationChangeStart', function (event, next, current) {
            if (next.split("#")[0] == current.split("#")[0]) {
                return;
            }

            if (!$scope.canEdit) {
                return;
            }

            if ($scope.dirty && !confirm(leavingPageText + "\n\nAre you sure you want to leave this page?")) {
                event.preventDefault();
            } else {
                Mousetrap.unbind("meta+s");
            }
        });

        $scope.saveQuery = function (duplicate, oldId) {
            if (!oldId) {
                oldId = $scope.query.id;
            }

            delete $scope.query.latest_query_data;
            $scope.query.$save(function (q) {
                pristineHash = q.getHash();
                $scope.dirty = false;

                if (duplicate) {
                    growl.addSuccessMessage("Query forked");
                } else {
                    growl.addSuccessMessage("Query saved");
                }

                if (oldId != q.id) {
                    $location.url(getQuerySourceUrl(q.id)).replace();
                }
            }, function (httpResponse) {
                growl.addErrorMessage("Query could not be saved");
            });
        };


        // new query
        if (!$route.current.locals.query) {
          $scope.query = new Query({
              query: "",
              name: "New Query",
              ttl: -1,
              user: currentUser
          });
          $scope.lockButton(false);
          $scope.isOwner = $scope.canEdit = true;
          $scope.isNewQuery = true;

          var unbind = $scope.$watch('selectedTab == "add"', function (newPanel) {
              if (newPanel && route.params.queryId == undefined) {
                  unbind();
                  $scope.saveQuery();
              }
          });
        }

        $scope.$watch(function () {
            return $scope.query.getHash();
        }, function (newHash) {
            $scope.dirty = (newHash !== pristineHash);
        });


        $scope.deleteVisualization = function ($e, vis) {
            $e.preventDefault();
            if (confirm('Are you sure you want to delete ' + vis.name + ' ?')) {
                Visualization.delete(vis);
                if ($scope.selectedTab == vis.id) {
                    $scope.selectedTab = DEFAULT_TAB;
                    $location.hash($scope.selectedTab);
                }
                $scope.query.visualizations =
                    $scope.query.visualizations.filter(function (v) {
                        return vis.id !== v.id;
                    });
            }
        };
    };

    angular.module('redash.controllers')
    .controller('QueryEditCtrl', ['$controller', '$scope', '$window', '$route', '$http', '$location', 'growl', 'notifications', 'Query', 'Visualization', QueryEditCtrl]);

})();