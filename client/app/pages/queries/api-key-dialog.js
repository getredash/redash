import { CopyClipboard } from '../../utils';

const ApiKeyDialog = {
  template: `<div class="modal-header">
    <button type="button" class="close" aria-label="Close" ng-click="$ctrl.close()"><span aria-hidden="true">&times;</span></button>
</div>
<div class="modal-body">
    <h5>API Key</h5>
    <pre>{{$ctrl.apiKey}}</pre>
    <div class="copy-link">
      <a clipboard supported="supported" text="$ctrl.apiKey" on-copied="$ctrl.copySuccess()" on-error="$ctrl.copyFail(err)">Copy</a>
    </div>

    <h5>Example API Calls:</h5>

    <div>
        Results in CSV format:

        <pre>{{$ctrl.csvUrl}}</pre>
        <div class="copy-link">
          <a clipboard supported="supported" text="$ctrl.csvUrl" on-copied="$ctrl.copySuccess()" on-error="$ctrl.copyFail(err)">Copy</a>
        </div>

        Results in JSON format:

        <pre>{{$ctrl.jsonUrl}}</pre>
        <div class="copy-link">
          <a clipboard supported="supported" text="$ctrl.jsonUrl" on-copied="$ctrl.copySuccess()" on-error="$ctrl.copyFail(err)">Copy</a>
        </div>
    </div>
</div>`,
  controller(clientConfig, toastr) {
    'ngInject';

    this.apiKey = this.resolve.query.api_key;
    this.csvUrl = `${clientConfig.basePath}api/queries/${this.resolve.query.id}/results.csv?api_key=${this.apiKey}`;
    this.jsonUrl = `${clientConfig.basePath}api/queries/${this.resolve.query.id}/results.json?api_key=${this.apiKey}`;
    this.copyClipboard = new CopyClipboard(toastr);

    this.copySuccess = () => {
      this.copyClipboard.success();
    };

    this.copyFail = (err) => {
      this.copyClipboard.fail(err);
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
