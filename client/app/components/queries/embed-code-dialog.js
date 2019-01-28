import template from './embed-code-dialog.html';

const EmbedCodeDialog = {
  controller(clientConfig) {
    'ngInject';

    this.query = this.resolve.query;
    this.visualization = this.resolve.visualization;

    this.embedUrl = `${clientConfig.basePath}embed/query/${this.query.id}/visualization/${
      this.visualization.id
    }?api_key=${this.query.api_key}`;
    if (window.snapshotUrlBuilder) {
      this.snapshotUrl = window.snapshotUrlBuilder(this.query, this.visualization);
    }
  },
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  template,
};

export default function init(ngModule) {
  ngModule.component('embedCodeDialog', EmbedCodeDialog);
}

init.init = true;
