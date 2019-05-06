// This polyfill is needed to support PhantomJS which we use to generate PNGs from embeds.
import 'core-js/fn/typed/array-buffer';

// Ensure that this image will be available in assets folder
import '@/assets/images/avatar.svg';

import * as Pace from 'pace-progress';
import debug from 'debug';
import angular from 'angular';
import ngSanitize from 'angular-sanitize';
import ngRoute from 'angular-route';
import ngResource from 'angular-resource';
import uiBootstrap from 'angular-ui-bootstrap';
import uiSelect from 'ui-select';
import ngMessages from 'angular-messages';
import ngUpload from 'angular-base64-upload';
import vsRepeat from 'angular-vs-repeat';
import 'brace';
import 'angular-ui-ace';
import 'angular-resizable';
import { each, isFunction, extend } from 'lodash';

import '@/lib/sortable';

import DialogWrapper from '@/components/DialogWrapper';
import organizationStatus from '@/services/organizationStatus';

import * as filters from '@/filters';
import registerDirectives from '@/directives';
import markdownFilter from '@/filters/markdown';
import dateTimeFilter from '@/filters/datetime';
import dashboardGridOptions from './dashboard-grid-options';
import './antd-spinner';

const logger = debug('redash:config');

Pace.options.shouldHandlePushState = (prevUrl, newUrl) => {
  // Show pace progress bar only if URL path changed; when query params
  // or hash changed - ignore that history event
  const [prevPrefix] = prevUrl.split('?');
  const [newPrefix] = newUrl.split('?');
  return prevPrefix !== newPrefix;
};

const requirements = [
  ngRoute,
  ngResource,
  ngSanitize,
  uiBootstrap,
  ngMessages,
  uiSelect,
  'ui.ace',
  ngUpload,
  'angularResizable',
  vsRepeat,
  'ui.sortable',
];

const ngModule = angular.module('app', requirements);

dashboardGridOptions(ngModule);

function registerAll(context) {
  const modules = context
    .keys()
    .map(context)
    .map(module => module.default);

  return modules
    .filter(isFunction)
    .filter(f => f.init)
    .map(f => f(ngModule));
}

function requireImages() {
  // client/app/assets/images/<path> => /images/<path>
  const ctx = require.context('@/assets/images/', true, /\.(png|jpe?g|gif|svg)$/);
  ctx.keys().forEach(ctx);
}

function registerComponents() {
  // We repeat this code in other register functions, because if we don't use a literal for the path
  // Webpack won't be able to statcily analyze our imports.
  const context = require.context('@/components', true, /^((?![\\/.]test[\\./]).)*\.jsx?$/);
  registerAll(context);
}

function registerExtensions() {
  const context = require.context('extensions', true, /^((?![\\/.]test[\\./]).)*\.jsx?$/);
  registerAll(context);
}

function registerServices() {
  const context = require.context('@/services', true, /^((?![\\/.]test[\\./]).)*\.js$/);
  registerAll(context);
}

function registerVisualizations() {
  const context = require.context('@/visualizations', true, /^((?![\\/.]test[\\./]).)*\.jsx?$/);
  registerAll(context);
}

function registerPages() {
  const context = require.context('@/pages', true, /^((?![\\/.]test[\\./]).)*\.jsx?$/);
  const routesCollection = registerAll(context);
  routesCollection.forEach((routes) => {
    ngModule.config(($routeProvider) => {
      each(routes, (route, path) => {
        logger('Registering route: %s', path);
        route.authenticated = true;
        route.resolve = extend(
          {
            __organizationStatus: () => organizationStatus.refresh(),
          },
          route.resolve,
        );
        $routeProvider.when(path, route);
      });
    });
  });

  ngModule.config(($routeProvider) => {
    $routeProvider.otherwise({
      resolve: {
        // Ugly hack to show 404 when hitting an unknown route.
        error: () => {
          const error = { status: 404 };
          throw error;
        },
      },
    });
  });
}

function registerFilters() {
  each(filters, (filter, name) => {
    ngModule.filter(name, () => filter);
  });
}

requireImages();
registerDirectives(ngModule);
registerServices();
registerFilters();
markdownFilter(ngModule);
dateTimeFilter(ngModule);
registerComponents();
registerPages();
registerExtensions();
registerVisualizations(ngModule);

ngModule.run(($q) => {
  DialogWrapper.Promise = $q;
});

export default ngModule;
