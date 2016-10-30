import angular from 'angular';
import ngRoute from 'angular-route';
import { each } from 'underscore';

import * as pages from './pages';
import * as components from './components';
import * as filters from './filters';
import markdownFilter from './filters/markdown';

const ngModule = angular.module('app', [ngRoute]);

function registerComponents() {
  each(components, (register) => {
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

registerFilters();
markdownFilter(ngModule);
registerComponents();
registerPages();

export default ngModule;
