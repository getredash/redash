import marked from 'marked';

const clientConfig = {
  allowScriptsInUserInput: false,
};

export default function (ngModule) {
  ngModule.filter('markdown', $sce =>
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
