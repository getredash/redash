import { buildListRoutes, ListCtrl } from '@/lib/list-ctrl';
import template from './dashboard-list.html';
import './dashboard-list.css';

class DashboardListCtrl extends ListCtrl {
  constructor($scope, $location, $route, currentUser, clientConfig, Dashboard) {
    super($scope, $location, $route, currentUser, clientConfig);
    this.Type = Dashboard;
  }

  processResponse(data) {
    super.processResponse(data);
    const rows = data.results.map(d => new this.Type(d));
    this.paginator.updateRows(rows, data.count);

    if (data.count === 0) {
      if (this.isInSearchMode()) {
        this.emptyType = 'search';
      } else if (this.selectedTags.size > 0) {
        this.emptyType = 'tags';
      } else if (this.currentPage === 'favorites') {
        this.emptyType = 'favorites';
      } else {
        this.emptyType = 'default';
      }
    }
    this.showEmptyState = data.count === 0;
  }
}

export default function init(ngModule) {
  ngModule.component('pageDashboardList', {
    template,
    controller: DashboardListCtrl,
  });
  const routes = [
    {
      page: 'all',
      title: 'All Dashboards',
      path: '/dashboards',
    },
    {
      page: 'favorites',
      title: 'Favorite Dashboards',
      path: '/dashboards/favorites',
    },
  ];

  return buildListRoutes('dashboard', routes, '<page-dashboard-list></page-dashboard-list>');
}

init.init = true;
