import moment from 'moment';

function queryResultLink() {
  return {
    restrict: 'A',
    link(scope, element, attrs) {
      const fileType = attrs.fileType ? attrs.fileType : 'csv';
      scope.$watch('queryResult && queryResult.getData()', (data) => {
        if (!data) {
          return;
        }

        if (scope.queryResult.getId() == null) {
          element.attr('href', '');
        } else {
          element.attr('href', `api/queries/${scope.query.id}/results/${scope.queryResult.getId()}.${fileType}${scope.embed ? `?api_key=${scope.apiKey}` : ''}`);
          element.attr('download', `${scope.query.name.replace(' ', '_') + moment(scope.queryResult.getUpdatedAt()).format('_YYYY_MM_DD')}.${fileType}`);
        }
      });
    },
  };
}

export default function (ngModule) {
  ngModule.directive('queryResultLink', queryResultLink);
}
