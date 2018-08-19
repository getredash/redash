import * as jsDiff from 'diff';
import template from './compare-query-dialog.html';
import './compare-query-dialog.css';

const CompareQueryDialog = {
  controller: ['clientConfig', '$http', function doCompare(clientConfig, $http) {
    this.currentQuery = this.resolve.query;

    this.previousQuery = '';
    this.currentDiff = [];
    this.previousDiff = [];
    this.versions = [];
    this.previousQueryVersion = this.currentQuery.version - 2; // due to 0-indexed versions[]

    this.compareQueries = (isInitialLoad) => {
      if (!isInitialLoad) {
        this.previousQueryVersion = document.getElementById('version-choice').value - 1; // due to 0-indexed versions[]
      }

      this.previousQuery = this.versions[this.previousQueryVersion].change.query.current;
      this.currentDiff = jsDiff.diffChars(this.previousQuery, this.currentQuery.query);
      document.querySelector('.compare-query-revert-wrapper').classList.remove('hidden');
    };

    this.revertQuery = () => {
      this.resolve.query.query = this.previousQuery;
      this.resolve.saveQuery();

      // Close modal.
      this.dismiss();
    };

    $http.get(`/api/queries/${this.currentQuery.id}/version`).then((response) => {
      this.versions = response.data;

      const compare = (a, b) => {
        if (a.object_version < b.object_version) {
          return -1;
        } else if (a.object_version > b.object_version) {
          return 1;
        }
        return 0;
      };

      this.versions.sort(compare);
      this.compareQueries(true);
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
