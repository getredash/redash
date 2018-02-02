import { isUndefined } from 'underscore';

const hasOwnProperty = Object.prototype.hasOwnProperty;

function trim(str) {
  return str.replace(/^\s+|\s+$/g, '');
}

function processTags(template, data, defaultColumn) {
  return template.replace(/{{\s*([^\s]+)\s*}}/g, (match, column) => {
    if (column === '@') {
      column = defaultColumn;
    }
    if (hasOwnProperty.call(data, column) && !isUndefined(data[column])) {
      return data[column];
    }
    return match;
  });
}

function buildImgTag(column, row) {
  const url = trim(processTags(column.imageUrlTemplate, row, column.name));
  const width = parseInt(processTags(column.imageWidth, row, column.name), 10);
  const height = parseInt(processTags(column.imageHeight, row, column.name), 10);
  const title = trim(processTags(column.imageTitleTemplate, row, column.name));

  const result = [];
  if (url !== '') {
    result.push('<img src="' + url + '"');

    if (isFinite(width) && (width > 0)) {
      result.push('width="' + width + '"');
    }
    if (isFinite(height) && (height > 0)) {
      result.push('height="' + height + '"');
    }
    if (title !== '') {
      result.push('title="' + title + '"');
    }

    result.push('>');
  }

  return result.join(' ');
}

export default function init(ngModule) {
  ngModule.directive('dynamicTableImageCell', $sanitize => ({
    template: '<td ng-bind-html="value"></td>',
    restrict: 'E',
    replace: true,
    scope: {
      column: '=',
      row: '=',
    },
    link: ($scope) => {
      $scope.value = $sanitize(buildImgTag($scope.column, $scope.row));

      $scope.$watch('row', (newValue, oldValue) => {
        if (newValue !== oldValue) {
          $scope.value = $sanitize(buildImgTag($scope.column, $scope.row));
        }
      });
    },
  }));
}
