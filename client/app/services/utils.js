import { extend, map, sortBy } from 'underscore';

export function absoluteUrl(url) {
  const urlObj = new URL(url, window.location);
  urlObj.protocol = window.location.protocol;
  urlObj.host = window.location.host;
  return urlObj.toString();
}

export function processTags(tags) {
  return map(sortBy(
    map(extend({}, tags), (count, tag) => ({ tag, count })),
    item => item.count,
  ), item => item.tag);
}
