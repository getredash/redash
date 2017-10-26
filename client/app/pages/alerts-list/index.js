import { Paginator } from '@/lib/pagination';
import template from './alerts-list.html';

const stateClass = {
  ok: 'label label-success',
  triggered: 'label label-danger',
  unknown: 'label label-warning',
};

class AlertsListCtrl {
  constructor(Events, Alert) {
    Events.record('view', 'page', 'alerts');

    this.alerts = new Paginator([], { itemsPerPage: 20 });
    Alert.query((alerts) => {
      this.alerts.updateRows(alerts.map(alert => ({
        id: alert.id,
        name: alert.name,
        state: alert.state,
        class: stateClass[alert.state],
        created_by: alert.user.name,
        created_at: alert.created_at,
        updated_at: alert.updated_at,
      })));
    });
  }
}

export default function init(ngModule) {
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
