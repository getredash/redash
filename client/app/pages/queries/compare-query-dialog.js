import * as jsDiff from 'diff';
import template from './compare-query-dialog.html';

const CompareQueryDialog = {
  controller(clientConfig, $http) {
    this.currentQuery = this.resolve.query;
    this.previousQueryVersion = document.getElementById('version-choice').value;

    let previousQuery = '';
    let currentDiff = [];
    let previousDiff = [];
    let styleClass = '';
    let span = null;

    $http.get(`/api/queries/${this.currentQuery.id}/version/${this.previousQueryVersion}`).then((response) => {
      previousQuery = response.data.change.query.current;
      currentDiff = jsDiff.diffChars(previousQuery, this.currentQuery.query);
      previousDiff = jsDiff.diffChars(this.currentQuery.query, previousQuery);

      function getDiffContent(diff) {
        const fragment = document.createDocumentFragment();

        diff.forEach((part) => {
          if (part.added) {
            styleClass = 'diff-added';
          } else if (part.removed) {
            styleClass = 'diff-removed';
          } else {
            styleClass = '';
          }

          span = document.createElement('span');

          if (styleClass) {
            span.className = styleClass;
          }

          span.appendChild(document.createTextNode(part.value));
          fragment.appendChild(span);
        });

        return fragment;
      }

      document.getElementById('current-query-diff').appendChild(getDiffContent(currentDiff));
      document.getElementById('previous-query-diff').appendChild(getDiffContent(previousDiff));
    });
  },
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  template,
};

export default function (ngModule) {
  ngModule.component('compareQueryDialog', CompareQueryDialog);
}
