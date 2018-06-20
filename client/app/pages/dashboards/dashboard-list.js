import _ from 'underscore';

import { Paginator } from '@/lib/pagination';
import template from './dashboard-list.html';
import './dashboard-list.css';

function DashboardListCtrl($scope, currentUser, $location) {
  const page = parseInt($location.search().page || 1, 10);

  // use $parent because we're using a component as route target instead of controller;
  // $parent refers to scope created for the page by router
  this.resource = $scope.$parent.$resolve.resource;
  this.currentPage = $scope.$parent.$resolve.currentPage;

  this.defaultOptions = {};
  this.dashboards = this.resource({}); // shared promise

  this.searchText = '';

  this.currentUser = currentUser;
  this.showMyDashboards = currentUser.hasPermission('create_dashboard');

  this.selectedTags = new Set();
  this.onTagsUpdate = (tags) => {
    this.selectedTags = tags;
    this.update();
  };

  this.showEmptyState = false;
  this.loaded = false;

  this.dashboards.$promise.then((data) => {
    this.loaded = true;
    this.showEmptyState = data.length === 0;
  });

  this.paginator = new Paginator([], { page });

  this.navigateTo = ($event, url) => {
    if ($event.altKey || $event.ctrlKey || $event.metaKey || $event.shiftKey) {
      // keep default browser behavior
      return;
    }
    $event.preventDefault();
    $location.url(url);
  };

  this.update = () => {
    this.dashboards.$promise.then((data) => {
      data = _.sortBy(data, 'name');
      const filteredDashboards = _.filter(data, (dashboard) => {
        const dashboardTags = new Set(dashboard.tags);
        const matchesAllTags = _.all([...this.selectedTags.values()], tag => dashboardTags.has(tag));
        if (!matchesAllTags) {
          return false;
        }
        if (_.isString(this.searchText) && this.searchText !== '') {
          if (!dashboard.name.toLowerCase().includes(this.searchText.toLowerCase())) {
            return false;
          }
        }
        return true;
      });

      this.paginator.updateRows(filteredDashboards);
      this.showEmptyState = filteredDashboards.length === 0;
    });
  };

  this.update();
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
    '/dashboards': _.extend(
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
    '/dashboards/my': _.extend(
      {
        title: 'My Dashboards',
        resolve: {
          currentPage: () => 'my',
          resource(Dashboard) {
            'ngInject';

            return Dashboard.myDashboards.bind(Dashboard);
          },
        },
      },
      route,
    ),
    '/dashboards/favorite': _.extend(
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
