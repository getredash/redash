import { template as templateBuilder } from 'lodash';
import notification from '@/services/notification';
import template from './alert.html';

function AlertCtrl($scope, $routeParams, $location, $sce, currentUser, Query, Events, Alert) {
  this.alertId = $routeParams.alertId;

  if (this.alertId === 'new') {
    Events.record('view', 'page', 'alerts/new');
  }

  this.trustAsHtml = html => $sce.trustAsHtml(html);

  this.onQuerySelected = (item) => {
    this.alert.query = item;
    this.selectedQuery = new Query(item);
    this.selectedQuery.getQueryResultPromise().then((result) => {
      this.queryResult = result;
      this.alert.options.column = this.alert.options.column || result.getColumnNames()[0];
    });
    $scope.$applyAsync();
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
    this.alert.$save(
      (alert) => {
        notification.success('Saved.');
        if (this.alertId === 'new') {
          $location.path(`/alerts/${alert.id}`).replace();
        }
      },
      () => {
        notification.error('Failed saving alert.');
      },
    );
  };

  this.delete = () => {
    this.alert.$delete(
      () => {
        $location.path('/alerts');
        notification.success('Alert deleted.');
      },
      () => {
        notification.error('Failed deleting alert.');
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
