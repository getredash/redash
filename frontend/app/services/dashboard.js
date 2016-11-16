import { map, isArray } from 'underscore';

function Dashboard($resource, $http, currentUser, Widget) {
  function transformSingle(dashboard) {
    dashboard.widgets = map(dashboard.widgets, row => row.map(widget => new Widget(widget)));
    dashboard.publicAccessEnabled = dashboard.public_url !== undefined;
  }

  const transform = $http.defaults.transformResponse.concat((data) => {
    if (isArray(data)) {
      data.forEach(transformSingle);
    } else {
      transformSingle(data);
    }
    return data;
  });

  const resource = $resource('api/dashboards/:slug', { slug: '@slug' }, {
    get: { method: 'GET', transformResponse: transform },
    save: { method: 'POST', transformResponse: transform },
    query: { method: 'GET', isArray: true, transformResponse: transform },
    recent: {
      method: 'get',
      isArray: true,
      url: 'api/dashboards/recent',
      transformResponse: transform,
    }
  });
  resource.prototype.canEdit = () => currentUser.canEdit(this) || this.can_edit;

  return resource;
}

export default function (ngModule) {
  ngModule.factory('Dashboard', Dashboard);
}
