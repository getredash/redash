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
      $scope.timelineData = {
        items: new VisDataSet(),
        groups: new VisDataSet(),
      };

      const getTimelineData = () => {
        const queryData = $scope.queryResult.getData();

        // reset data
        $scope.timelineData.items.clear();
        $scope.timelineData.groups.clear();

        if (queryData) {
          const itemContent = $scope.options.content;
          const startDate = $scope.options.start;
          const endDate = $scope.options.end;
          const groupBy = $scope.options.groupBy;

          // Required fields
          if (isNullOrUndefined(itemContent) || isNullOrUndefined(startDate)) return;

          // Extract groups
          if (!isNullOrUndefined(groupBy)) {
            const groups = _.chain(queryData)
              .pluck(groupBy)
              .unique()
              .map(group => ({
                id: group,
                content: _.isNumber(group) ? group.toString() : group,
              }))
              .value();

            // Add to groups dataset
            $scope.timelineData.groups.add(groups);
            console.log($scope.timelineData.groups);
          }

          // Create timeline items
          _.each(queryData, (row) => {
            const content = row[itemContent];
            const start = row[startDate];
            const end = row[endDate];
            const group = row[groupBy];

            // required fields; avoid timeline error
            if (content === null || start === null) return;

            const item = {
              content,
              start,
              ...endDate && { end },
              ...groupBy && { group },
            };

            // Add to items dataset
            $scope.timelineData.items.add(item);
          });
          console.log($scope.timelineData.items);
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
