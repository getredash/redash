import * as _ from 'underscore';

function Dashboard($resource, $http, currentUser, Widget, dashboardGridOptions) {
  function prepareDashboardWidgets(widgets) {
    const widgetObjects = widgets.map(widget => new Widget(widget));
    const sortedByRow = _.sortBy(widgetObjects, widget => widget.options.position && widget.options.position.row);
    return sortedByRow;
  }

  function transformSingle(dashboard) {
    if (dashboard.widgets) {
      dashboard.widgets = prepareDashboardWidgets(dashboard.widgets);
    }
    dashboard.publicAccessEnabled = dashboard.public_url !== undefined;
  }

  const transform = $http.defaults.transformResponse.concat((data) => {
    if (_.isArray(data)) {
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

  resource.prototype.calculateNewWidgetPosition = function calculateNewWidgetPosition(widget) {
    const width = (_.extend(
      { sizeX: dashboardGridOptions.defaultSizeX },
      _.extend({}, widget.options).position,
    )).sizeX;

    // Find first free row for each column
    const bottomLine = _.chain(this.widgets)
      .map((w) => {
        const options = _.extend({}, w.options);
        const position = _.extend({ row: 0, sizeY: 0 }, options.position);
        return {
          left: position.col,
          top: position.row,
          right: position.col + position.sizeX,
          bottom: position.row + position.sizeY,
          width: position.sizeX,
          height: position.sizeY,
        };
      })
      .reduce((result, item) => {
        const from = Math.max(item.left, 0);
        const to = Math.min(item.right, result.length + 1);
        for (let i = from; i < to; i += 1) {
          result[i] = Math.max(result[i], item.bottom);
        }
        return result;
      }, _.map(new Array(dashboardGridOptions.columns), _.constant(0)))
      .value();

    // Go through columns, pick them by count necessary to hold new block,
    // and calculate bottom-most free row per group.
    // Choose group with the top-most free row (comparing to other groups)
    return _.chain(_.range(0, dashboardGridOptions.columns - width + 1))
      .map(col => ({
        col,
        row: _.chain(bottomLine)
          .slice(col, col + width)
          .max()
          .value(),
      }))
      .sortBy('row')
      .first()
      .value();
  };

  resource.prepareDashboardWidgets = prepareDashboardWidgets;

  return resource;
}

export default function init(ngModule) {
  ngModule.factory('Dashboard', Dashboard);
}
