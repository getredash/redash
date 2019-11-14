import _ from 'lodash';
import dashboardGridOptions from '@/config/dashboard-grid-options';
import { Widget } from './widget';

export let Dashboard = null; // eslint-disable-line import/no-mutable-exports

export function collectDashboardFilters(dashboard, queryResults, urlParams) {
  const filters = {};
  _.each(queryResults, (queryResult) => {
    const queryFilters = queryResult && queryResult.getFilters ? queryResult.getFilters() : [];
    _.each(queryFilters, (queryFilter) => {
      const hasQueryStringValue = _.has(urlParams, queryFilter.name);

      if (!(hasQueryStringValue || dashboard.dashboard_filters_enabled)) {
        // If dashboard filters not enabled, or no query string value given,
        // skip filters linking.
        return;
      }

      if (hasQueryStringValue) {
        queryFilter.current = urlParams[queryFilter.name];
      }

      const filter = { ...queryFilter };
      if (!_.has(filters, queryFilter.name)) {
        filters[filter.name] = filter;
      } else {
        filters[filter.name].values = _.union(filters[filter.name].values, filter.values);
      }
    });
  });

  return _.values(filters);
}

function calculateNewWidgetPosition(existingWidgets, newWidget) {
  const width = _.extend({ sizeX: dashboardGridOptions.defaultSizeX }, _.extend({}, newWidget.options).position).sizeX;

  // Find first free row for each column
  const bottomLine = _
    .chain(existingWidgets)
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
  return _
    .chain(_.range(0, dashboardGridOptions.columns - width + 1))
    .map(col => ({
      col,
      row: _
        .chain(bottomLine)
        .slice(col, col + width)
        .max()
        .value(),
    }))
    .sortBy('row')
    .first()
    .value();
}

function DashboardService($resource, $http, $location, currentUser) {
  function prepareDashboardWidgets(widgets) {
    return _.map(widgets, widget => new Widget(widget));
  }

  function transformSingle(dashboard) {
    if (dashboard.widgets) {
      dashboard.widgets = prepareDashboardWidgets(dashboard.widgets);
    }
    dashboard.publicAccessEnabled = dashboard.public_url !== undefined;
  }

  const transform = $http.defaults.transformResponse.concat((data) => {
    if (data.results) {
      data.results.forEach(transformSingle);
    } else {
      transformSingle(data);
    }
    return data;
  });

  const resource = $resource(
    'api/dashboards/:slug',
    { slug: '@slug' },
    {
      get: { method: 'GET', transformResponse: transform },
      getByToken: {
        method: 'GET',
        url: 'api/dashboards/public/:token',
        transformResponse: transform,
      },
      save: { method: 'POST', transformResponse: transform },
      query: { method: 'GET', isArray: false, transformResponse: transform },
      recent: {
        method: 'get',
        isArray: true,
        url: 'api/dashboards/recent',
        transformResponse: transform,
      },
      favorites: {
        method: 'get',
        isArray: false,
        url: 'api/dashboards/favorites',
      },
      favorite: {
        method: 'post',
        isArray: false,
        url: 'api/dashboards/:slug/favorite',
        transformRequest: [() => ''], // body not needed
      },
      unfavorite: {
        method: 'delete',
        isArray: false,
        url: 'api/dashboards/:slug/favorite',
        transformRequest: [() => ''], // body not needed
      },
    },
  );

  resource.prototype.canEdit = function canEdit() {
    return currentUser.canEdit(this) || this.can_edit;
  };

  resource.prepareDashboardWidgets = prepareDashboardWidgets;
  resource.prototype.getParametersDefs = function getParametersDefs() {
    const globalParams = {};
    const queryParams = $location.search();
    _.each(this.widgets, (widget) => {
      if (widget.getQuery()) {
        const mappings = widget.getParameterMappings();
        widget
          .getQuery()
          .getParametersDefs(false)
          .forEach((param) => {
            const mapping = mappings[param.name];
            if (mapping.type === Widget.MappingType.DashboardLevel) {
              // create global param
              if (!globalParams[mapping.mapTo]) {
                globalParams[mapping.mapTo] = param.clone();
                globalParams[mapping.mapTo].name = mapping.mapTo;
                globalParams[mapping.mapTo].title = mapping.title || param.title;
                globalParams[mapping.mapTo].locals = [];
              }

              // add to locals list
              globalParams[mapping.mapTo].locals.push(param);
            }
          });
      }
    });
    return _.values(_.each(globalParams, (param) => {
      param.setValue(param.value); // apply global param value to all locals
      param.fromUrlParams(queryParams); // try to initialize from url (may do nothing)
    }));
  };

  resource.prototype.addWidget = function addWidget(textOrVisualization, options = {}) {
    const props = {
      dashboard_id: this.id,
      options: {
        ...options,
        isHidden: false,
        position: {},
      },
      text: '',
      visualization_id: null,
      visualization: null,
    };

    if (_.isString(textOrVisualization)) {
      props.text = textOrVisualization;
    } else if (_.isObject(textOrVisualization)) {
      props.visualization_id = textOrVisualization.id;
      props.visualization = textOrVisualization;
    } else {
      // TODO: Throw an error?
    }

    const widget = new Widget(props);

    const position = calculateNewWidgetPosition(this.widgets, widget);
    widget.options.position.col = position.col;
    widget.options.position.row = position.row;

    return widget.save().then(() => {
      this.widgets = [...this.widgets, widget]; // ANGULAR_REMOVE_ME
      return widget;
    });
  };

  return resource;
}

export default function init(ngModule) {
  ngModule.factory('Dashboard', DashboardService);

  ngModule.run(($injector) => {
    Dashboard = $injector.get('Dashboard');
  });
}

init.init = true;
