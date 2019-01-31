import moment from 'moment';

function queryResultLink() {
  return {
    restrict: 'A',
    link(scope, element, attrs) {
      const fileType = attrs.fileType ? attrs.fileType : 'csv';
      scope.$watch('queryResult && queryResult.getData() && query.name', (data) => {
        if (!data) {
          return;
        }

        if (scope.queryResult.getId() == null) {
          element.attr('href', '');
        } else {
          let url;
          if (scope.query.id) {
            url = `api/queries/${scope.query.id}/results/${scope.queryResult.getId()}.${fileType}${scope.embed
              ? `?api_key=${scope.apiKey}`
              : ''}`;
          } else {
            url = `api/query_results/${scope.queryResult.getId()}.${fileType}`;
          }
          element.attr('href', url);
          element.attr(
            'download',
            `${scope.query.name.replace(/ /g, '_') +
              moment(scope.queryResult.getUpdatedAt()).format('_YYYY_MM_DD')}.${fileType}`,
          );
        }
      });
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('queryResultLink', queryResultLink);
}

init.init = true;
