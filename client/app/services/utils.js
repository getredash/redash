/* eslint-disable import/prefer-default-export */

export function absoluteUrl(url) {
  const urlObj = new URL(url, window.location);
  urlObj.protocol = window.location.protocol;
  urlObj.host = window.location.host;
  return urlObj.toString();
}
