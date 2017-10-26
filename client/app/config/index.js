// This polyfill is needed to support PhantomJS which we use to generate PNGs from embeds.
import 'core-js/fn/typed/array-buffer';

import 'pace-progress';
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
import { each } from 'underscore';

import '@/lib/sortable';

import * as filters from '@/filters';
import registerDirectives from '@/directives';
import markdownFilter from '@/filters/markdown';
import dateTimeFilter from '@/filters/datetime';

const logger = debug('redash:config');

const requirements = [
  ngRoute,
  ngResource,
  ngSanitize,
  uiBootstrap,
  ngMessages,
  uiSelect,
  'angularMoment',
  toastr,
  'ui.ace',
  ngUpload,
  'angularResizable',
  vsRepeat,
  'ui.sortable',
  ngGridster.name,
];

const ngModule = angular.module('app', requirements);

function registerAll(context) {
  const modules = context
    .keys()
    .map(context)
    .map(module => module.default);

  return modules.map(f => f(ngModule));
}

function registerComponents() {
  // We repeat this code in other register functions, because if we don't use a literal for the path
  // Webpack won't be able to statcily analyze our imports.
  const context = require.context('@/components', true, /^((?![\\/]test[\\/]).)*\.js$/);
  registerAll(context);
}

function registerServices() {
  const context = require.context('@/services', true, /^((?![\\/]test[\\/]).)*\.js$/);
  registerAll(context);
}

function registerVisualizations() {
  const context = require.context('@/visualizations', true, /^((?![\\/]test[\\/]).)*\.js$/);
  registerAll(context);
}

function registerPages() {
  const context = require.context('@/pages', true, /^((?![\\/]test[\\/]).)*\.js$/);
  const routesCollection = registerAll(context);
  routesCollection.forEach((routes) => {
    ngModule.config(($routeProvider) => {
      each(routes, (route, path) => {
        logger('Registering route: %s', path);
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

export default ngModule;
