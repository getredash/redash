import { template as templateBuilder } from 'underscore';
import template from './alert.html';

function AlertCtrl($routeParams, $location, $sce, toastr, currentUser, Query, Events, Alert) {
  this.alertId = $routeParams.alertId;

  if (this.alertId === 'new') {
    Events.record('view', 'page', 'alerts/new');
  } else {
    Events.record('view', 'alert', this.alertId);
  }

  this.trustAsHtml = html => $sce.trustAsHtml(html);

  this.onQuerySelected = (item) => {
    this.selectedQuery = item;
    item.getQueryResultPromise().then((result) => {
      this.queryResult = result;
      this.alert.options.column = this.alert.options.column || result.getColumnNames()[0];
    });
  };

  if (this.alertId === 'new') {
    this.alert = new Alert({ options: {} });
    this.canEdit = true;
  } else {
    this.alert = Alert.get({ id: this.alertId }, (alert) => {
      this.onQuerySelected(new Query(alert.query));
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

    Query.search({ q: term }, (results) => {
      this.queries = results;
    });
  };

  this.saveChanges = () => {
    if (this.alert.name === undefined || this.alert.name === '') {
      this.alert.name = this.getDefaultName();
    }
    if (this.alert.rearm === '' || this.alert.rearm === 0) {
      this.alert.rearm = null;
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
