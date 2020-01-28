// This polyfill is needed to support PhantomJS which we use to generate PNGs from embeds.
import "core-js/fn/typed/array-buffer";

// Ensure that this image will be available in assets folder
import "@/assets/images/avatar.svg";

import * as Pace from "pace-progress";
import { isFunction } from "lodash";
import url from "@/services/url";

import "./antd-spinner";
import moment from "moment";

Pace.options.shouldHandlePushState = (prevUrl, newUrl) => {
  // Show pace progress bar only if URL path changed; when query params
  // or hash changed - ignore that history event
  prevUrl = url.parse(prevUrl);
  newUrl = url.parse(newUrl);
  return prevUrl.pathname !== newUrl.pathname;
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

function registerAll(context) {
  const modules = context
    .keys()
    .map(context)
    .map(module => module.default);

  return modules
    .filter(isFunction)
    .filter(f => f.init)
    .map(f => f());
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

function registerVisualizations() {
  const context = require.context("@/visualizations", true, /^((?![\\/.]test[\\./]).)*\.jsx?$/);
  registerAll(context);
}

requireImages();
registerExtensions();
registerVisualizations();
