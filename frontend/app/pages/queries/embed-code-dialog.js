import template from './embed-code-dialog.html';

const EmbedCodeDialog = {
  controller(clientConfig) {
    this.query = this.resolve.query;
    this.visualization = this.resolve.visualization;

    this.embedUrl = `${clientConfig.basePath}embed/query/${this.query.id}/visualization/${this.visualization.id}?api_key=${this.query.api_key}`;
    console.log(window.snapshotUrl);
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

export default function (ngModule) {
  ngModule.component('embedCodeDialog', EmbedCodeDialog);
}
