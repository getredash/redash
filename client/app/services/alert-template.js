// import { $http } from '@/services/ng';
import Mustache from 'mustache';

export default class AlertTemplate {
  render(alert, queryResult) {
    const view = {
      state: alert.state,
      rows: queryResult.rows,
      cols: queryResult.columns,
    };
    const result = Mustache.render(alert.options.template, view);
    const escaped = result
      .replace(/"/g, '&quot;')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n|\r/g, '<br>');

    return { escaped, raw: result };
  }

  constructor() {
    this.helpMessage = `using template engine "mustache".
      you can build message with latest query result.
      variable name "rows" is assigned as result rows. "cols" as result columns, "state" as alert state.`;

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
