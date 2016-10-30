import 'material-design-iconic-font/dist/css/material-design-iconic-font.css';
import 'font-awesome/css/font-awesome.css';

import angular from 'angular';
import ngRoute from 'angular-route';
import ngResource from 'angular-resource';
import uiBootstrap from 'angular-ui-bootstrap';
import { each } from 'underscore';

import './assets/css/superflat_redash.css';
import './assets/css/redash.css';

import * as pages from './pages';
import * as components from './components';
import * as filters from './filters';
import * as services from './services';
import markdownFilter from './filters/markdown';

const ngModule = angular.module('app', [ngRoute, ngResource, uiBootstrap]);

const user = {
  name: 'Arik Fraimovich',
  gravatar_url: 'https://www.gravatar.com/avatar/ca410c2e27337c8d7075bb1b098ac70f?s=40',
  id: 1,
  groups: [
    3,
    1,
  ],
  email: 'arik@redash.io',
  permissions: [
    'admin',
    'super_admin',
    'create_dashboard',
    'create_query',
    'edit_dashboard',
    'edit_query',
    'view_query',
    'view_source',
    'list_users',
    'execute_query',
    'schedule_query',
    'list_dashboards',
    'list_alerts',
    'create_alerts',
    'list_dashboards',
    'list_alerts',
    'list_data_sources',
  ],
  isAdmin: true,
};

user.hasPermission = () => true;
ngModule.constant('currentUser', user);

function registerComponents() {
  each(components, (register) => {
    register(ngModule);
  });
}

function registerServices() {
  each(services, (register) => {
    register(ngModule);
  });
}

function registerPages() {
  each(pages, (registerPage) => {
    const routes = registerPage(ngModule);

    ngModule.config(($routeProvider) => {
      each(routes, (route, path) => {
        $routeProvider.when(path, route);
      });
    });
  });
}

function registerFilters() {
  each(filters, (filter, name) => {
    ngModule.filter(name, () => filter);
  });
}

registerServices();
registerFilters();
markdownFilter(ngModule);
registerComponents();
registerPages();

export default ngModule;
