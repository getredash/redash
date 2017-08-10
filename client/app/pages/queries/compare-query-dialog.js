import * as jsDiff from 'diff';
import template from './compare-query-dialog.html';
import './compare-query-dialog.css';

const CompareQueryDialog = {
  controller: ['clientConfig', '$http', function doCompare(clientConfig, $http) {
    this.currentQuery = this.resolve.query;

    this.previousQueryVersion = document.getElementById('version-choice').value;

    let previousQuery = '';
    this.currentDiff = [];
    this.previousDiff = [];
    this.versions = [];
    this.previousQueryVersion = this.currentQuery.version - 1;

    this.compareQueries = () => {
      this.previousQueryVersion = document.getElementById('version-choice').value ||
                                  this.previousQueryVersion;

      previousQuery = this.versions[this.previousQueryVersion];
      this.currentDiff = jsDiff.diffChars(previousQuery, this.currentQuery.query);
      this.previousDiff = jsDiff.diffChars(this.currentQuery.query, previousQuery);
      document.querySelector('.compare-query-revert-wrapper').classList.remove('hidden');
    };

    this.revertQuery = () => {
      this.resolve.query.query = previousQuery;
      this.resolve.saveQuery();

      // Close modal.
      this.dismiss();
    };

    $http.get(`/api/queries/${this.currentQuery.id}/version`).then((response) => {
      this.versions = response.data;
    });
  }],
  scope: {
    query: '=',
    saveQuery: '<',
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
