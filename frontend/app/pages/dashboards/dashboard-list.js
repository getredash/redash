import template from './dashboard-list.html';
import {_} from 'underscore';

function DashboardListCtrl($scope, Dashboard, $location, currentUser, clientConfig, NgTableParams) {
  const self = this;

  this.logoUrl = clientConfig.logoUrl;
  const page = parseInt($location.search().page || 1, 10);
  const count = 25;

  this.defaultOptions = {};
  this.dashboards = Dashboard.query({}); // shared promise

  self.selectedTags = []; // in scope because it needs to be accessed inside a table refresh
  self.searchText = "";

  this.tagIsSelected = (tag) => {
    return self.selectedTags.indexOf(tag) > -1;
  }

  this.toggleTag = (tag) => {
    if(this.tagIsSelected(tag)){
      self.selectedTags = self.selectedTags.filter((e) => e!=tag);
    }else{
      self.selectedTags.push(tag);
    }
    this.tableParams.reload();
  }

  this.allTags = [];
  self.dashboards.$promise.then((data) => {
    const out = data.map((dashboard) => {
      return dashboard.name.match(/(^\w+):|(#\w+)/ig);
    });
    this.allTags = _.unique(_.flatten(out)).filter((e) => e);
  });

  this.tableParams = new NgTableParams({ page, count }, {
    getData(params) {
      const options = params.url();
      $location.search('page', options.page);

      const request = {};

      return self.dashboards.$promise.then((data) => {
        params.total(data.count);
        return data.map((dashboard) => {
          dashboard.tags = dashboard.name.match(/(^\w+):|(#\w+)/ig);
          dashboard.untagged_name = dashboard.name.replace(/(\w+):|(#\w+)/ig, '').trim();
          return dashboard;
        }).filter((value) => {
          if(self.selectedTags.length){
            const value_tags = new Set(value.tags);
            const tag_match = self.selectedTags;
            const filtered_match = tag_match.filter(x => value_tags.has(x));
            if(tag_match.length != filtered_match.length){
              return false;
            }
          }
          if(self.searchText && self.searchText.length){
            if(!value.untagged_name.toLowerCase().includes(self.searchText)){
              return false;
            }
          }
          return true;
        });
      });
    }
  });

  this.tabs = [
    { name: 'All Dashboards', path: 'dashboards' },
  ];

  self.currentUser = currentUser;
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
