import { $http } from '@/services/ng';

export default class AlertTemplate {
  render(template, queryResult) {
    const url = 'api/alerts/template';
    return $http
      .post(url, { template, data: queryResult })
      .then((res) => {
        const data = JSON.parse(res.data);
        const preview = data.preview;
        const escaped = data.preview
          .replace(/"/g, '&quot;')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const previewEscaped = escaped.replace(/\n|\r/g, '<br>');
        const error = data.error;
        return { preview, previewEscaped, error };
      });
  }

  constructor() {
    this.helpMessage = `using template engine "Jinja2".
      you can build message with latest query result.
      variable name "rows" is assigned as result rows. "cols" as result columns.`;

    this.editorOptions = {
      useWrapMode: true,
      showPrintMargin: false,
      advanced: {
        behavioursEnabled: true,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        autoScrollEditorIntoView: true,
      },
      onLoad(editor) {
        editor.$blockScrolling = Infinity;
      },
    };
  }
}
