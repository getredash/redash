import * as jsDiff from 'diff';
import template from './compare-query-dialog.html';
import './compare-query-dialog.css';

const CompareQueryDialog = {
  controller(clientConfig, $http) {
    this.currentQuery = this.resolve.query;

    let previousQuery = '';
    this.currentDiff = [];
    this.previousDiff = [];
    this.versions = [];
    this.previousQueryVersion = this.currentQuery.version - 1;

    this.compareQueries = () => {
      this.previousQueryVersion = document.getElementById('version-choice').value || this.previousQueryVersion;
      $http.get(`/api/changes/${this.previousQueryVersion}`).then((response) => {
        previousQuery = response.data.change.query.current;
        this.currentDiff = jsDiff.diffChars(previousQuery, this.currentQuery.query);
        this.previousDiff = jsDiff.diffChars(this.currentQuery.query, previousQuery);
      });
    };

    $http.get(`/api/queries/${this.currentQuery.id}/version`).then((response) => {
      this.versions = response.data.results;
      // We don't need the last element of the returned versions.
      this.versions = this.versions.slice(0, this.versions.length - 1);
    });

    $http.get(`/api/changes/${this.previousQueryVersion}`).then((response) => {
      previousQuery = response.data.change.query.current;
      this.currentDiff = jsDiff.diffChars(previousQuery, this.currentQuery.query);
      this.previousDiff = jsDiff.diffChars(this.currentQuery.query, previousQuery);
    });
  },
  scope: {
    query: '=',
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
