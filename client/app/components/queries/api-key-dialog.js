const ApiKeyDialog = {
  template: `<div class="modal-header">
    <button type="button" class="close" aria-label="Close" ng-click="$ctrl.close()"><span aria-hidden="true">&times;</span></button>
</div>
<div class="modal-body">
    <h5>API Key</h5>
    <div class="form-group">
        <pre>{{$ctrl.query.api_key}}</pre>
        <div ng-if="$ctrl.canEdit">
            <button class="btn btn-default" ng-click="$ctrl.regenerateQueryApiKey()" ng-disabled="$ctrl.disableRegenerateApiKeyButton">Regenerate</button>
        </div>
    </div>

    <h5>Example API Calls:</h5>

    <div>
        Results in CSV format:

        <pre>{{$ctrl.csvUrlBase + $ctrl.query.api_key}}</pre>

        Results in JSON format:

        <pre>{{$ctrl.jsonUrlBase + $ctrl.query.api_key}}</pre>
    </div>
</div>`,
  controller($http, clientConfig, currentUser) {
    'ngInject';

    this.canEdit = currentUser.id === this.resolve.query.user.id || currentUser.hasPermission('admin');
    this.disableRegenerateApiKeyButton = false;
    this.query = this.resolve.query;
    this.csvUrlBase = `${clientConfig.basePath}api/queries/${this.resolve.query.id}/results.csv?api_key=`;
    this.jsonUrlBase = `${clientConfig.basePath}api/queries/${this.resolve.query.id}/results.json?api_key=`;

    this.regenerateQueryApiKey = () => {
      this.disableRegenerateApiKeyButton = true;
      $http
        .post(`api/queries/${this.resolve.query.id}/regenerate_api_key`)
        .success((data) => {
          this.query.api_key = data.api_key;
          this.disableRegenerateApiKeyButton = false;
        })
        .error(() => {
          this.disableRegenerateApiKeyButton = false;
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
