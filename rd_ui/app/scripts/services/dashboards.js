(function () {
    var Dashboard = function($resource, $http, Widget) {

      var transformSingle = function(dashboard) {
        dashboard.widgets = _.map(dashboard.widgets, function (row) {
          return _.map(row, function (widget) {
            return new Widget(widget);
          });
        });
        dashboard.publicAccessEnabled = dashboard.public_url !== undefined;
      };

      var transform = $http.defaults.transformResponse.concat(function(data, headers) {
        if (_.isArray(data)) {
          _.each(data, transformSingle);
        } else {
          transformSingle(data);
        }
        return data;
      });

      var resource = $resource('api/dashboards/:slug', {slug: '@slug'}, {
        'get': {method: 'GET', transformResponse: transform},
        'save': {method: 'POST', transformResponse: transform},
        'query': {method: 'GET', isArray: true, transformResponse: transform},
        recent: {
          method: 'get',
          isArray: true,
          url: "api/dashboards/recent",
          transformResponse: transform
      }});

      var loadAccessPermission = function(dashboard) {
        var action = 'modify';
        var body = {};
        currentUser.accessPermissions[this] = false;
        $http.post('api/access/Dashboard/' + dashboard.id + '/' + action, body).then(function() {
          currentUser.accessPermissions[dashboard] = true;
        }, function() {
          /* access denied, cannot edit this dashboard. */
          currentUser.accessPermissions[dashboard] = false;
        });
      };

      resource.prototype.canEdit = function() {
        if(!currentUser.accessPermissions) {
          currentUser.accessPermissions = {};
        }
        if(currentUser.hasPermission('admin') 
            || currentUser.canEdit(this)
            || currentUser.accessPermissions[this]) {
          return true;
        }
        if(this.id) {
          if(typeof currentUser.accessPermissions[this] === 'undefined') {
            currentUser.accessPermissions[this] = false;
            loadAccessPermission(this);
          }
        }
      };

      return resource;
    }

    angular.module('redash.services')
        .factory('Dashboard', ['$resource', '$http', 'Widget', Dashboard])
})();
