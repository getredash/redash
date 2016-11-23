import marked from 'marked';

export default function (ngModule) {
  ngModule.filter('markdown', ($sce, clientConfig) =>
     function markdown(text) {
       if (!text) {
         return '';
       }

       let html = marked(String(text));
       if (clientConfig.allowScriptsInUserInput) {
         html = $sce.trustAsHtml(html);
       }

       return html;
     }
  );
}
