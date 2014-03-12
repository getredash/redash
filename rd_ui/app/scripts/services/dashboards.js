(function () {
    var Dashboard = function($resource) {
        var resource = $resource('/api/dashboards/:slug', {slug: '@slug'});
        resource.prototype.canEdit = function() {
            return currentUser.hasPermission('admin') || currentUser.canEdit(this);
        }
        return resource;
    }

    angular.module('redash.services')
        .factory('Dashboard', ['$resource', Dashboard])
})();
