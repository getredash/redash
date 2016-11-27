import 'material-design-iconic-font/dist/css/material-design-iconic-font.css';
import 'font-awesome/css/font-awesome.css';
import 'ui-select/dist/select.css';
import 'angular-toastr/dist/angular-toastr.css';
import 'angular-resizable/src/angular-resizable.css';
import 'angular-gridster/dist/angular-gridster.css';

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
import vsRepeat from 'angular-vs-repeat';
import 'angular-moment';
import 'brace';
import 'angular-ui-ace';
import 'angular-resizable';
import ngGridster from 'angular-gridster';
import { ngTable } from 'ng-table';
import { each } from 'underscore';

import './sortable';

import './assets/css/superflat_redash.css';
import './assets/css/redash.css';

import * as pages from './pages';
import * as components from './components';
import * as filters from './filters';
import * as services from './services';
import registerDirectives from './directives';
import registerVisualizations from './visualizations';
import markdownFilter from './filters/markdown';
import dateTimeFilter from './filters/datetime';

const logger = debug('redash');

const requirements = [
  ngRoute, ngResource, ngSanitize, uiBootstrap, ngMessages, uiSelect, ngTable.name, 'angularMoment', toastr, 'ui.ace',
  ngUpload, 'angularResizable', vsRepeat, 'ui.sortable', ngGridster.name,
];

const ngModule = angular.module('app', requirements);

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
        // This is a workaround, to make sure app-header and footer are loaded only
        // for the authenticated routes.
        // We should look into switching to ui-router, that has built in support for
        // such things.
        route.template = `<app-header></app-header><route-status></route-status>${route.template}<footer></footer>`;
        route.authenticated = true;
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

registerDirectives(ngModule);
registerServices();
registerFilters();
markdownFilter(ngModule);
dateTimeFilter(ngModule);
registerComponents();
registerPages();
registerVisualizations(ngModule);

ngModule.config(($routeProvider, $locationProvider, $compileProvider,
  uiSelectConfig, toastrConfig) => {
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|http|data):/);
  $locationProvider.html5Mode(true);
  uiSelectConfig.theme = 'bootstrap';

  Object.assign(toastrConfig, {
    positionClass: 'toast-bottom-right',
    timeOut: 2000,
  });
});

export default ngModule;
