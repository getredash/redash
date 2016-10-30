import truncate from 'underscore.string/truncate';

function Widget($resource, Query) {
  const WidgetResource = $resource('api/widgets/:id', { id: '@id' });

  WidgetResource.prototype.getQuery = function getQuery() {
    if (!this.query && this.visualization) {
      this.query = new Query(this.visualization.query);
    }

    return this.query;
  };

  WidgetResource.prototype.getName = function getName() {
    if (this.visualization) {
      return `${this.visualization.query.name} (${this.visualization.name})`;
    }
    return truncate(this.text, 20);
  };

  return WidgetResource;
}


export default function (ngModule) {
  ngModule.factory('Widget', Widget);
}
