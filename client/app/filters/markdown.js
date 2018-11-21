import { markdown } from 'markdown';

export default function init(ngModule) {
  ngModule.filter('markdown', ($sce, clientConfig) =>
    function parseMarkdown(text) {
      if (!text) {
        return '';
      }

      let html = markdown.toHTML(String(text));
      if (clientConfig.allowScriptsInUserInput) {
        html = $sce.trustAsHtml(html);
      }

      return html;
    });
}

init.init = true;

