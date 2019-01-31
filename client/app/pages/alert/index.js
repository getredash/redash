import { template as templateBuilder } from 'lodash';
import template from './alert.html';

function AlertCtrl($routeParams, $location, $sce, $http, toastr, currentUser, Query, Events, Alert) {
  this.alertId = $routeParams.alertId;
  this.hidePreview = false;
  this.templateHelpMsg = `using template engine "Jinja2".
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

  this.preview = () => {
    const result = this.queryResult.query_result.data;
    const url = 'api/alerts/template';
    $http
      .post(url, { template: this.alert.template, data: result })
      .success((res) => {
        const data = JSON.parse(res);
        const preview = data.preview;
        this.alert.preview = $sce.trustAsHtml(preview);
        const replaced = preview
          .replace(/"/g, '&quot;')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        this.alert.previewHTML = $sce.trustAsHtml(replaced.replace(/\n|\r/g, '<br>'));
        if (data.error) {
          toastr.error('Unable to build description. please confirm your template.', { timeOut: 10000 });
        }
      })
      .error(() => {
        toastr.error('Failed. unexpected error.');
      });
  };

  if (this.alertId === 'new') {
    Events.record('view', 'page', 'alerts/new');
  }

  this.trustAsHtml = html => $sce.trustAsHtml(html);

  this.onQuerySelected = (item) => {
    this.selectedQuery = new Query(item);
    this.selectedQuery.getQueryResultPromise().then((result) => {
      this.queryResult = result;
      this.alert.options.column = this.alert.options.column || result.getColumnNames()[0];
    });
  };

  if (this.alertId === 'new') {
    this.alert = new Alert({ options: {} });
    this.canEdit = true;
  } else {
    this.alert = Alert.get({ id: this.alertId }, (alert) => {
      this.onQuerySelected(alert.query);
      this.canEdit = currentUser.canEdit(this.alert);
    });
  }

  this.ops = ['greater than', 'less than', 'equals'];
  this.selectedQuery = null;

  const defaultNameBuilder = templateBuilder('<%= query.name %>: <%= options.column %> <%= options.op %> <%= options.value %>');

  this.getDefaultName = () => {
    if (!this.alert.query) {
      return undefined;
    }
    return defaultNameBuilder(this.alert);
  };

  this.searchQueries = (term) => {
    if (!term || term.length < 3) {
      return;
    }

    Query.query({ q: term }, (results) => {
      this.queries = results.results;
    });
  };

  this.saveChanges = () => {
    if (this.alert.name === undefined || this.alert.name === '') {
      this.alert.name = this.getDefaultName();
    }
    if (this.alert.rearm === '' || this.alert.rearm === 0) {
      this.alert.rearm = null;
    }
    if (this.alert.template === undefined || this.alert.template === '') {
      this.alert.template = null;
    }
    this.alert.$save(
      (alert) => {
        toastr.success('Saved.');
        if (this.alertId === 'new') {
          $location.path(`/alerts/${alert.id}`).replace();
        }
      },
      () => {
        toastr.error('Failed saving alert.');
      },
    );
  };

  this.delete = () => {
    this.alert.$delete(
      () => {
        $location.path('/alerts');
        toastr.success('Alert deleted.');
      },
      () => {
        toastr.error('Failed deleting alert.');
      },
    );
  };
}

export default function init(ngModule) {
  ngModule.component('alertPage', {
    template,
    controller: AlertCtrl,
  });

  return {
    '/alerts/:alertId': {
      template: '<alert-page></alert-page>',
      title: 'Alerts',
    },
  };
}

init.init = true;
