import { extend } from 'lodash';

import ListCtrl from '@/lib/list-ctrl';
import template from './dashboard-list.html';
import './dashboard-list.css';

class DashboardListCtrl extends ListCtrl {
  constructor($scope, $location, currentUser, clientConfig, Dashboard) {
    super($scope, $location, currentUser, clientConfig);
    this.Type = Dashboard;
  }

  processResponse(data) {
    super.processResponse(data);
    const rows = data.results.map(d => new this.Type(d));
    this.paginator.updateRows(rows, data.count);
    this.showEmptyState = data.count === 0;
  }
}

export default function init(ngModule) {
  ngModule.component('pageDashboardList', {
    template,
    controller: DashboardListCtrl,
  });

  const route = {
    template: '<page-dashboard-list></page-dashboard-list>',
    reloadOnSearch: false,
  };

  return {
    '/dashboards': extend(
      {
        title: 'Dashboards',
        resolve: {
          currentPage: () => 'all',
          resource(Dashboard) {
            'ngInject';

            return Dashboard.query.bind(Dashboard);
          },
        },
      },
      route,
    ),
    '/dashboards/favorites': extend(
      {
        title: 'Favorite Dashboards',
        resolve: {
          currentPage: () => 'favorites',
          resource(Dashboard) {
            'ngInject';

            return Dashboard.favorites.bind(Dashboard);
          },
        },
      },
      route,
    ),
  };
}

init.init = true;

