import { extend } from 'lodash';

import ListCtrl from '@/lib/list-ctrl';
import { $route } from '@/services/ng';
import { Dashboard } from '@/services/dashboard';
import template from './dashboard-list.html';
import './dashboard-list.css';

class DashboardListCtrl extends ListCtrl {
  constructor() {
    const currentPage = $route.current.locals.currentPage;
    const resources = {
      all: Dashboard.query.bind(Dashboard),
      favorites: Dashboard.favorites.bind(Dashboard),
    };
    super(currentPage, resources[currentPage]);
  }

  processResponse(data) {
    super.processResponse(data);
    const rows = data.results.map(d => new Dashboard(d));
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
        },
      },
      route,
    ),
    '/dashboards/favorites': extend(
      {
        title: 'Favorite Dashboards',
        resolve: {
          currentPage: () => 'favorites',
        },
      },
      route,
    ),
  };
}

init.init = true;
