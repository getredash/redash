import 'material-design-iconic-font/dist/css/material-design-iconic-font.css';
import 'font-awesome/css/font-awesome.css';
import 'ui-select/dist/select.css';
import 'angular-toastr/dist/angular-toastr.css';

import debug from 'debug';
import angular from 'angular';
import ngSanitize from 'angular-sanitize';
import ngRoute from 'angular-route';
import ngResource from 'angular-resource';
import uiBootstrap from 'angular-ui-bootstrap';
import uiSelect from 'ui-select';
import ngMessages from 'angular-messages';
import toastr from 'angular-toastr';
import ngUpload from 'angular-base64-upload';
import 'angular-moment';

import 'brace';
import 'angular-ui-ace';
import 'angular-resizable';

import { ngTable } from 'ng-table';
import { each } from 'underscore';

import './assets/css/superflat_redash.css';
import './assets/css/redash.css';

import * as pages from './pages';
import * as components from './components';
import * as filters from './filters';
import * as services from './services';
import registerVisualizations from './visualizations';
import markdownFilter from './filters/markdown';

const logger = debug('redash');

const requirements = [
  ngRoute, ngResource, ngSanitize, uiBootstrap, ngMessages, uiSelect, ngTable.name, 'angularMoment', toastr, 'ui.ace',
  ngUpload, 'angularResizable',
];

const ngModule = angular.module('app', requirements);

// stub for currentUser until we have something real.
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
user.canEdit = () => true;
ngModule.constant('currentUser', user);
ngModule.constant('clientConfig', {
  showPermissionsControl: true,
  // mailSettingsMissing: true,
});

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
        logger('Route: ', path);
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
registerVisualizations(ngModule);

ngModule.config(($routeProvider,
  $locationProvider,
  $compileProvider,
  uiSelectConfig,
  toastrConfig) => {
  // TODO:
  // if (false) { // currentUser.apiKey) {
  //   $httpProvider.defaults.headers.common.Authorization = `Key ${currentUser.apiKey}`;
  // }

  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|http|data):/);
  $locationProvider.html5Mode(true);
  uiSelectConfig.theme = 'bootstrap';

  Object.assign(toastrConfig, {
    positionClass: 'toast-bottom-right',
    timeOut: 2000,
  });
});

export default ngModule;
