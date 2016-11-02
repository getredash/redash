import template from './alerts-list.html';

class AlertsListCtrl {
  constructor(NgTableParams, currentUser, Events, Alert) {
    Events.record(currentUser, 'view', 'page', 'alerts');
    // $scope.$parent.pageTitle = "Alerts";

    this.tableParams = new NgTableParams({ count: 50 }, {});

    Alert.query((alerts) => {
      const stateClass = {
        ok: 'label label-success',
        triggered: 'label label-danger',
        unknown: 'label label-warning',
      };

      alerts.forEach((alert) => {
        alert.class = stateClass[alert.state];
      });

      this.tableParams.settings({
        dataset: alerts,
      });
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
    },
  };
}
