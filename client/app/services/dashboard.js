import { map, flatten, extend, isArray } from 'underscore';

function Dashboard($resource, $http, currentUser, Widget, dashboardGridOptions) {
  function transformSingle(dashboard) {
    if (
      isArray(dashboard.widgets) && (dashboard.widgets.length > 0) &&
      isArray(dashboard.widgets[0])
    ) {
      // Dashboard v1 processing
      // v1 dashboard has two columns, and widget can occupy one of them or both;
      // this means, that there can be at most two widgets per row.
      // Here we will map gridster columns and rows to v1-style grid
      const dashboardV1ColumnSize = Math.round(dashboardGridOptions.columns / 2);
      dashboard.widgets = map(
        dashboard.widgets,
        (row, rowIndex) => map(row, (widget, widgetIndex) => {
          widget.options = widget.options || {};
          widget.options.position = extend({}, {
            row: rowIndex,
            col: widgetIndex * dashboardV1ColumnSize,
            sizeX: dashboardV1ColumnSize * widget.width,
            sizeY: -1, // auto
          }, widget.options.position);
          return widget;
        }),
      );
    }

    dashboard.widgets = map(flatten(dashboard.widgets), widget => new Widget(widget));

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
    },
  });

  resource.prototype.canEdit = function canEdit() {
    return currentUser.canEdit(this) || this.can_edit;
  };

  return resource;
}

export default function init(ngModule) {
  ngModule.factory('Dashboard', Dashboard);
}
