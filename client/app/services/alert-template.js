import { $http } from '@/services/ng';

export let AlertTemplate = null; // eslint-disable-line import/no-mutable-exports

function AlertTemplateService() {
  const Alert = {
    render: (template, queryResult) => {
      const url = 'api/alerts/template';
      return $http
        .post(url, { template, data: queryResult })
        .then((res) => {
          const data = JSON.parse(res.data);
          const preview = data.preview;
          const error = data.error;
          return { preview, error };
        });
    },
    helpMessage: `using template engine "Jinja2".
      you can build message with latest query result.
      variable name "rows" is assigned as result rows. "cols" as result columns.`,
    editorOptions: {
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
    },
  };

  return Alert;
}


export default function init(ngModule) {
  ngModule.factory('AlertTemplate', AlertTemplateService);

  ngModule.run(($injector) => {
    AlertTemplate = $injector.get('AlertTemplate');
  });
}

init.init = true;
