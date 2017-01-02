import _ from 'underscore';

import { Paginator } from '../../utils';
import template from './dashboard-list.html';

function DashboardListCtrl(Dashboard, $location, clientConfig) {
  const self = this;

  this.logoUrl = clientConfig.logoUrl;
  const page = parseInt($location.search().page || 1, 10);

  this.defaultOptions = {};
  this.dashboards = Dashboard.query({}); // shared promise

  this.selectedTags = []; // in scope because it needs to be accessed inside a table refresh
  this.searchText = '';

  this.tagIsSelected = tag => this.selectedTags.indexOf(tag) > -1;

  this.toggleTag = (tag) => {
    if (this.tagIsSelected(tag)) {
      this.selectedTags = this.selectedTags.filter(e => e !== tag);
    } else {
      this.selectedTags.push(tag);
    }
    this.update();
  };

  this.allTags = [];
  this.dashboards.$promise.then((data) => {
    const out = data.map(dashboard => dashboard.name.match(/(^\w+):|(#\w+)/ig));
    this.allTags = _.unique(_.flatten(out)).filter(e => e);
  });

  this.paginator = new Paginator([], { page });

  this.update = () => {
    self.dashboards.$promise.then((data) => {
      const filteredDashboards = data.map((dashboard) => {
        dashboard.tags = dashboard.name.match(/(^\w+):|(#\w+)/ig);
        dashboard.untagged_name = dashboard.name.replace(/(\w+):|(#\w+)/ig, '').trim();
        return dashboard;
      }).filter((value) => {
        if (self.selectedTags.length) {
          const valueTags = new Set(value.tags);
          const tagMatch = self.selectedTags;
          const filteredMatch = tagMatch.filter(x => valueTags.has(x));
          if (tagMatch.length !== filteredMatch.length) {
            return false;
          }
        }
        if (self.searchText && self.searchText.length) {
          if (!value.untagged_name.toLowerCase().includes(self.searchText)) {
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

export default function (ngModule) {
  ngModule.component('pageDashboardList', {
    template,
    controller: DashboardListCtrl,
  });

  const route = {
    template: '<page-dashboard-list></page-dashboard-list>',
    reloadOnSearch: false,
  };

  return {
    '/dashboards': route,
  };
}
