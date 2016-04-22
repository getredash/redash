var redash_extra = angular.module('redash_xtra', []);

redash_extra.config(['$interpolateProvider', function($interpolateProvider) {
    $interpolateProvider.startSymbol('{[');
    $interpolateProvider.endSymbol(']}');
}]);

redash_extra.controller('DashboardImportCtrl', function($scope, $http) {

    $scope.uploadFile = function(file) {
        var reader = new FileReader();
        reader.onloadend = function(e){
            $scope.data = JSON.parse(e.target.result);
            $http.post(
                '/__admin/dashboard/get_item_status', 
                {
                    "dashboards": $scope.data.dashboards.map(function(d) {
                        return {"id": d.id, "name": d.name, layout: JSON.parse(d.layout)};
                    }),
                    "widgets": $scope.data.widgets.map(function(w) { 
                        return {"id": w.id, "options": JSON.parse(w.options), "text": w.text};
                    }),
                    "visualizations": $scope.data.visualizations.map(function(v) {
                        return {"id": v.id, "name": v.name, "options": JSON.parse(v.options)};
                    }),
                    "queries": $scope.data.queries.map(function(q) {
                        return {"id": q.id, "name": q.name, "query": q.query};
                    })
                }).success(function(status_data) {
                    $scope.data_status = status_data;
                    angular.forEach(status_data, function(category, type) {
                        angular.forEach(category, function(item, id) {
                            $scope.add_item(type, id, item);
                        });
                    });
                });
        };
        if (file.length > 0) {
            reader.readAsBinaryString(file[0]); // Lo que llega es un FileList, saco el primer archivito.
        }
        $scope.$apply();
    };

    $scope.item_action = {};

    $scope.add_item = function(type, id, item) {
        if (!(type in $scope.item_action)) {
            $scope.item_action[type] = {};
        }
        // Dashboards and widgets are ALWAYS inserted.
        if (type == 'dashboards' || type == 'widgets') {
            $scope.item_action[type][id] = 'new';
        } else {
            if (!item.exists) $scope.item_action[type][id] = 'insert';
            else if (item.exists && item.matches) $scope.item_action[type][id] = 'reuse';
            else if (item.exists && !item.matches) $scope.item_action[type][id] = 'new';
        }
    };

    $scope.get_status = function(t, i) {
        if (!$scope.data_status[t][i].exists) {
            return { 
                "class": "ok-message", 
                "message": "Item doesn't exist. Will be inserted.",
                "action": "insert"
            };
        }
        if ($scope.data_status[t][i].exists && !$scope.data_status[t][i].matches) {
            return { 
                "class": "error-message", 
                "message": "Item exists and is different. Choose an action.",
                "action": "ask-user"
            };
        }
        if ($scope.data_status[t][i].exists && $scope.data_status[t][i].matches) {
            return { 
                "class": "ok-message", 
                "message": "Item exists and is equal. No action required.",
                "action": "reuse"
            };
        }
    };

    $scope.res = '';

    $scope.submit = function() {
        $http.post(
            '/__admin/dashboard/do_import', 
            {
               "data": $scope.data,
               "actions": $scope.item_action
            }
        ).success(function(data) {
            // TODO
            $scope.res = data;
        });
    };

 

    $scope.data = null;
});
