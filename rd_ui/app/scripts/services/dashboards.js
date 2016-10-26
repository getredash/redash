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

      resource.prototype.canEdit = function() {
        return currentUser.canEdit(this) || this.can_edit;
      };

      return resource;
    }

    angular.module('redash.services')
        .factory('Dashboard', ['$resource', '$http', 'Widget', Dashboard])
})();
