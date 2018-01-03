import _ from 'underscore';

import { Paginator } from '@/lib/pagination';
import template from './dashboard-list.html';
import './dashboard-list.css';


function DashboardListCtrl(Dashboard, $location) {
  const TAGS_REGEX = /(^([\w\s]|[^\u0000-\u007F])+):|(#([\w-]|[^\u0000-\u007F])+)/ig;

  const page = parseInt($location.search().page || 1, 10);

  this.defaultOptions = {};
  this.dashboards = Dashboard.query({}); // shared promise

  this.selectedTags = []; // in scope because it needs to be accessed inside a table refresh
  this.searchText = '';

  this.tagIsSelected = tag => this.selectedTags.indexOf(tag) > -1;

  this.toggleTag = ($event, tag) => {
    if (this.tagIsSelected(tag)) {
      if ($event.shiftKey) {
        this.selectedTags = this.selectedTags.filter(e => e !== tag);
      } else {
        this.selectedTags = [];
      }
    } else if ($event.shiftKey) {
      this.selectedTags.push(tag);
    } else {
      this.selectedTags = [tag];
    }

    this.update();
  };

  this.allTags = [];
  this.dashboards.$promise.then((data) => {
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
        if (this.selectedTags.length) {
          const valueTags = new Set(value.tags);
          const tagMatch = this.selectedTags;
          const filteredMatch = tagMatch.filter(x => valueTags.has(x));
          if (tagMatch.length !== filteredMatch.length) {
            return false;
          }
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
    title: 'Dashboards',
  };

  return {
    '/dashboards': route,
  };
}
