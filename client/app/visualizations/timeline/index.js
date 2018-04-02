import { _ } from 'underscore';
import { isNullOrUndefined } from 'util';
import template from './timeline.html';
import editorTemplate from './timeline-editor.html';

function TimelineRenderer(VisDataSet) {
  return {
    restrict: 'E',
    scope: {
      queryResult: '=',
      options: '=?',
    },
    template,
    replace: false,
    controller($scope) {
      $scope.timelineOptions = {
        // start: null,
        // end: null,
      };

      const getTimelineItems = (queryData) => {
        const timelineItems = [];

        _.each(queryData, (row) => {
          const content = row[$scope.options.content];
          const start = row[$scope.options.start];
          const end = row[$scope.options.end];
          const group = row[$scope.options.groupBy];

          // skip rows where required fields are null
          if (content === null || start === null) return;

          const item = {
            content,
            start,
            ...$scope.options.end && { end },
            ...$scope.options.groupBy && { group },
          };

          timelineItems.push(item);
        });

        return timelineItems;
      };

      const getTimelineGroups = (queryData) => {
        const groupBy = $scope.options.groupBy;

        if (!isNullOrUndefined(groupBy)) {
          return _.chain(queryData)
            .pluck(groupBy)
            .unique()
            .map(group => ({
              id: group,
              content: _.isNumber(group) ? group.toString() : group,
            }))
            .value();
        }

        return [];
      };

      const getTimelineData = () => {
        const queryData = $scope.queryResult.getData();

        if (queryData) {
          // Required fields
          if (isNullOrUndefined($scope.options.content) || isNullOrUndefined($scope.options.start)) return;

          $scope.timelineData = {
            items: new VisDataSet(getTimelineItems(queryData)),
            groups: new VisDataSet(getTimelineGroups(queryData)),
          };
        }
      };

      $scope.$watch('options', getTimelineData, true);
      $scope.$watch('queryResult && queryResult.getData()', getTimelineData);
    },
  };
}

function TimelineEditor() {
  return {
    restrict: 'E',
    template: editorTemplate,
    link($scope) {
      $scope.currentTab = 'general';
      $scope.columns = $scope.queryResult.getColumns();
      $scope.columnNames = _.pluck($scope.columns, 'name');
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('timelineRenderer', TimelineRenderer);
  ngModule.directive('timelineEditor', TimelineEditor);

  ngModule.config((VisualizationProvider) => {
    const renderTemplate = '<timeline-renderer options="visualization.options" query-result="queryResult"></timeline-renderer>';
    const editTemplate = '<timeline-editor></timeline-editor>';

    // const defaultOptions = {

    // };

    VisualizationProvider.registerVisualization({
      type: 'TIMELINE',
      name: 'Timeline',
      renderTemplate,
      editorTemplate: editTemplate,
      // defaultOptions,
    });
  });
}
