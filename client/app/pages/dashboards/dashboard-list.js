import _ from 'underscore';

import { Paginator } from '@/lib/pagination';
import template from './dashboard-list.html';
import './dashboard-list.css';

function DashboardListCtrl($scope, currentUser, $location) {
  const TAGS_REGEX = /(^([\w\s]|[^\u0000-\u007F])+):|(#([\w-]|[^\u0000-\u007F])+)/ig;

  const page = parseInt($location.search().page || 1, 10);

  // use $parent because we're using a component as route target instead of controller;
  // $parent refers to scope created for the page by router
  this.resource = $scope.$parent.$resolve.resource;
  this.currentPage = $scope.$parent.$resolve.currentPage;

  this.defaultOptions = {};
  this.dashboards = this.resource({}); // shared promise

  this.selectedTags = new Set();
  this.searchText = '';

  this.currentUser = currentUser;

  this.toggleTag = ($event, tag) => {
    if ($event.shiftKey) {
      // toggle tag
      if (this.selectedTags.has(tag)) {
        this.selectedTags.delete(tag);
      } else {
        this.selectedTags.add(tag);
      }
    } else {
      // if the tag is the only selected, deselect it, otherwise select only it
      if (this.selectedTags.has(tag) && (this.selectedTags.size === 1)) {
        this.selectedTags.clear();
      } else {
        this.selectedTags.clear();
        this.selectedTags.add(tag);
      }
    }

    this.update();
  };

  this.allTags = [];
  this.showEmptyState = false;

  this.dashboards.$promise.then((data) => {
    this.showEmptyState = data.length === 0;
    const out = data.map(dashboard => dashboard.name.match(TAGS_REGEX));
    this.allTags = _.unique(_.flatten(out)).filter(e => e).map(tag => tag.replace(/:$/, ''));
    this.allTags.sort();
  });

  this.paginator = new Paginator([], { page });

  this.update = () => {
    this.dashboards.$promise.then((data) => {
      data = _.sortBy(data, 'name');
      const filteredDashboards = data.map((dashboard) => {
        dashboard.tags = (dashboard.name.match(TAGS_REGEX) || []).map(tag => tag.replace(/:$/, ''));
        dashboard.untagged_name = dashboard.name.replace(TAGS_REGEX, '').trim();
        return dashboard;
      }).filter((value) => {
        const valueTags = new Set(value.tags);
        const matchesAllTags = _.all(
          [...this.selectedTags.values()],
          tag => valueTags.has(tag),
        );
        if (!matchesAllTags) {
          return false;
        }
        if (this.searchText && this.searchText.length) {
          if (!value.untagged_name.toLowerCase().includes(this.searchText.toLowerCase())) {
            return false;
          }
        }
        return true;
      });

      this.paginator.updateRows(filteredDashboards, data.count);
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
    '/dashboards': _.extend({
      title: 'Dashboards',
      resolve: {
        currentPage: () => 'all',
        resource(Dashboard) {
          'ngInject';

          return Dashboard.query.bind(Dashboard);
        },
      },
    }, route),
    '/dashboards/my': _.extend({
      title: 'My Dashboards',
      resolve: {
        currentPage: () => 'my',
        resource(Dashboard) {
          'ngInject';

          return Dashboard.myDashboards.bind(Dashboard);
        },
      },
    }, route),
    '/dashboards/favorite': _.extend({
      title: 'Favorite Dashboards',
      resolve: {
        currentPage: () => 'favorites',
        resource(Dashboard) {
          'ngInject';

          return Dashboard.favorites.bind(Dashboard);
        },
      },
    }, route),
  };
}
