import { Paginator } from '../../utils';
import template from './alerts-list.html';

class AlertsListCtrl {
  constructor(Events, Alert) {
    Events.record('view', 'page', 'alerts');

    this.alerts = new Paginator([], { itemsPerPage: 20 });

    Alert.query((alerts) => {
      const stateClass = {
        ok: 'label label-success',
        triggered: 'label label-danger',
        unknown: 'label label-warning',
      };

      alerts.forEach((alert) => {
        alert.class = stateClass[alert.state];
      });

      this.alerts.updateRows(alerts);
    });
  }
}

export default function (ngModule) {
  ngModule.component('alertsListPage', {
    template,
    controller: AlertsListCtrl,
  });

  return {
    '/alerts': {
      template: '<alerts-list-page></alerts-list-page>',
      title: 'Alerts',
    },
  };
}
