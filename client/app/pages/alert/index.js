import { template as templateBuilder } from 'lodash';
import template from './alert.html';

function AlertCtrl($routeParams, $location, $sce, toastr, currentUser, Query, Events, Alert, AlertTemplate) {
  this.alertId = $routeParams.alertId;
  this.hidePreview = false;
  this.templateHelpMsg = AlertTemplate.helpMessage;
  this.editorOptions = AlertTemplate.editorOptions;

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

  this.preview = () => AlertTemplate.render(this.alert.template, this.queryResult.query_result.data)
    .then((data) => {
      if (data.error) {
        toastr.error('Unable to build description. please confirm your template.', { timeOut: 10000 });
        return;
      }
      this.alert.preview = data.preview;
      this.alert.previewHTML = $sce.trustAsHtml(data.preview);
    })
    .catch(() => {
      toastr.error('Failed. unexpected error.');
    });

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
