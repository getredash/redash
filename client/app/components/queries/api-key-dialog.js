const ApiKeyDialog = {
  template: `<div class="modal-header">
    <button type="button" class="close" aria-label="Close" ng-click="$ctrl.close()"><span aria-hidden="true">&times;</span></button>
</div>
<div class="modal-body">
    <h5>API Key</h5>
    <div class="form-group">
        <pre>{{query.api_key}}</pre>
        <div ng-if="canEdit">
            <button class="btn btn-default" ng-click="$ctrl.regenerateQueryApiKey()" ng-disabled="disableRegenerateApiKeyButton">Regenerate</button>
        </div>
    </div>

    <h5>Example API Calls:</h5>

    <div>
        Results in CSV format:

        <pre>{{$ctrl.csvUrlBase + query.api_key}}</pre>

        Results in JSON format:

        <pre>{{$ctrl.jsonUrlBase + query.api_key}}</pre>
    </div>
</div>`,
  controller($scope, $http, clientConfig, currentUser) {
    'ngInject';

    $scope.canEdit = currentUser.id === this.resolve.query.user.id || currentUser.hasPermission('admin');
    $scope.disableRegenerateApiKeyButton = false;
    $scope.query = this.resolve.query;
    this.csvUrlBase = `${clientConfig.basePath}api/queries/${this.resolve.query.id}/results.csv?api_key=`;
    this.jsonUrlBase = `${clientConfig.basePath}api/queries/${this.resolve.query.id}/results.json?api_key=`;

    this.regenerateQueryApiKey = () => {
      $scope.disableRegenerateApiKeyButton = true;
      $http
        .post(`api/queries/${this.resolve.query.id}/regenerate_api_key`)
        .success((data) => {
          $scope.query = data;
          $scope.disableRegenerateApiKeyButton = false;
        })
        .error(() => {
          $scope.disableRegenerateApiKeyButton = false;
        });
    };
  },
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
};

export default function init(ngModule) {
  ngModule.component('apiKeyDialog', ApiKeyDialog);
}

init.init = true;
