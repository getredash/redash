// This polyfill is needed to support PhantomJS which we use to generate PNGs from embeds.
import "core-js/fn/typed/array-buffer";

// Ensure that this image will be available in assets folder
import "@/assets/images/avatar.svg";

import * as Pace from "pace-progress";
import debug from "debug";
import angular from "angular";
import ngSanitize from "angular-sanitize";
import ngRoute from "angular-route";
import ngResource from "angular-resource";
import { each, isFunction, extend } from "lodash";

import initAppView from "@/components/app-view";
import DialogWrapper from "@/components/DialogWrapper";
import organizationStatus from "@/services/organizationStatus";

import "./antd-spinner";
import moment from "moment";

const logger = debug("redash:config");

Pace.options.shouldHandlePushState = (prevUrl, newUrl) => {
  // Show pace progress bar only if URL path changed; when query params
  // or hash changed - ignore that history event
  const [prevPrefix] = prevUrl.split("?");
  const [newPrefix] = newUrl.split("?");
  return prevPrefix !== newPrefix;
};

moment.updateLocale("en", {
  relativeTime: {
    future: "%s",
    past: "%s",
    s: "just now",
    m: "a minute ago",
    mm: "%d minutes ago",
    h: "an hour ago",
    hh: "%d hours ago",
    d: "a day ago",
    dd: "%d days ago",
    M: "a month ago",
    MM: "%d months ago",
    y: "a year ago",
    yy: "%d years ago",
  },
});

const requirements = [ngRoute, ngResource, ngSanitize];

const ngModule = angular.module("app", requirements);

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
  const ctx = require.context("@/assets/images/", true, /\.(png|jpe?g|gif|svg)$/);
  ctx.keys().forEach(ctx);
}

function registerExtensions() {
  const context = require.context("extensions", true, /^((?![\\/.]test[\\./]).)*\.jsx?$/);
  registerAll(context);
}

function registerServices() {
  const context = require.context("@/services", true, /^((?![\\/.]test[\\./]).)*\.js$/);
  registerAll(context);
}

function registerVisualizations() {
  const context = require.context("@/visualizations", true, /^((?![\\/.]test[\\./]).)*\.jsx?$/);
  registerAll(context);
}

function registerPages() {
  const context = require.context("@/pages", true, /^((?![\\/.]test[\\./]).)*\.jsx?$/);
  const routesCollection = registerAll(context);
  routesCollection.forEach(routes => {
    ngModule.config($routeProvider => {
      each(routes, (route, path) => {
        logger("Registering route: %s", path);
        route.authenticated = route.authenticated !== false; // could be set to `false` do disable auth
        if (route.authenticated) {
          route.resolve = extend(
            {
              __organizationStatus: () => organizationStatus.refresh(),
            },
            route.resolve
          );
        }
        $routeProvider.when(path, route);
      });
    });
  });

  ngModule.config($routeProvider => {
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

requireImages();
registerServices();
initAppView(ngModule);
registerPages();
registerExtensions();
registerVisualizations();

ngModule.run($q => {
  DialogWrapper.Promise = $q;
});

export default ngModule;
