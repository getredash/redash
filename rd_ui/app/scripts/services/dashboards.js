(function () {
    var Dashboard = function($resource) {
      var resource = $resource('/api/dashboards/:slug', {slug: '@slug'}, {
        recent: {
          method: 'get',
          isArray: true,
          url: "/api/dashboards/recent"
        }});

        resource.prototype.canEdit = function() {
            return currentUser.hasPermission('admin') || currentUser.canEdit(this);
        }
        return resource;
    }

    angular.module('redash.services')
        .factory('Dashboard', ['$resource', Dashboard])
})();
