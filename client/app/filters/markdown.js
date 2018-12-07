import marked from 'marked';

export default function init(ngModule) {
  ngModule.filter('markdown', ($sce, clientConfig) =>
    function parseMarkdown(text) {
      if (!text) {
        return '';
      }

      let html = marked(String(text));
      if (clientConfig.allowScriptsInUserInput) {
        html = $sce.trustAsHtml(html);
      }

      return html;
    });
}

init.init = true;

