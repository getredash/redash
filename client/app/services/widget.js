import { truncate } from 'underscore.string';
import { pick, omit, flatten, extend, isObject } from 'underscore';

function Widget($resource, $http, Query, Visualization, dashboardGridOptions) {
  function prepareForSave(data) {
    return omit(data, 'query');
  }

  const WidgetResource = $resource('api/widgets/:id', { id: '@id' }, {
    get: { method: 'GET' },
    save: {
      method: 'POST',
      transformRequest: flatten([prepareForSave, $http.defaults.transformRequest]),
    },
    query: { method: 'GET', isArray: true },
    remove: { method: 'DELETE' },
    delete: { method: 'DELETE' },
  });

  WidgetResource.prototype.getQuery = function getQuery() {
    if (!this.query && this.visualization) {
      this.query = new Query(this.visualization.query);
    }

    return this.query;
  };

  WidgetResource.prototype.getQueryResult = function getQueryResult(force, maxAge) {
    if (!this.visualization) {
      return undefined;
    }

    if (force || this.queryResult === undefined) {
      if (maxAge === undefined || force) {
        maxAge = force ? 0 : undefined;
      }
      this.queryResult = this.getQuery().getQueryResult(maxAge);
    }

    return this.queryResult;
  };

  WidgetResource.prototype.getName = function getName() {
    if (this.visualization) {
      return `${this.visualization.query.name} (${this.visualization.name})`;
    }
    return truncate(this.text, 20);
  };

  function WidgetConstructor(widget) {
    widget.width = 1; // Backward compatibility, user on back-end

    const visualizationOptions = {
      sizeX: Math.round(dashboardGridOptions.columns / 2),
      sizeY: -1, // auto-height
      minSizeX: dashboardGridOptions.minSizeX,
      maxSizeX: dashboardGridOptions.maxSizeX,
      minSizeY: dashboardGridOptions.minSizeY,
      maxSizeY: dashboardGridOptions.maxSizeY,
    };
    const visualization = widget.visualization ?
      Visualization.visualizations[widget.visualization.type] : null;
    if (isObject(visualization)) {
      const options = extend({}, visualization.defaultOptions);

      // Width constraints
      const minColumns = parseInt(options.minColumns, 10);
      if (isFinite(minColumns) && (minColumns >= 0)) {
        visualizationOptions.minSizeX = minColumns;
      }
      const maxColumns = parseInt(options.maxColumns, 10);
      if (isFinite(maxColumns) && (maxColumns >= 0)) {
        visualizationOptions.maxSizeX = Math.min(maxColumns, dashboardGridOptions.columns);
      }

      // Height constraints
      // `minRows` is preferred, but it should be kept for backward compatibility
      const height = parseInt(options.height, 10);
      if (isFinite(height)) {
        visualizationOptions.minSizeY = Math.ceil(height / dashboardGridOptions.rowHeight);
      }
      const minRows = parseInt(options.minRows, 10);
      if (isFinite(minRows)) {
        visualizationOptions.minSizeY = minRows;
      }
      const maxRows = parseInt(options.maxRows, 10);
      if (isFinite(maxRows) && (maxRows >= 0)) {
        visualizationOptions.maxSizeY = maxRows;
      }

      // Default dimensions
      const defaultWidth = parseInt(options.defaultColumns, 10);
      if (isFinite(defaultWidth) && (defaultWidth > 0)) {
        visualizationOptions.sizeX = defaultWidth;
      }
      const defaultHeight = parseInt(options.defaultRows, 10);
      if (isFinite(defaultHeight) && (defaultHeight > 0)) {
        visualizationOptions.sizeY = defaultHeight;
      }
    }

    widget.options = widget.options || {};
    widget.options.position = extend(
      {},
      visualizationOptions,
      pick(widget.options.position, ['col', 'row', 'sizeX', 'sizeY']),
    );

    return new WidgetResource(widget);
  }

  return WidgetConstructor;
}


export default function init(ngModule) {
  ngModule.factory('Widget', Widget);
}
