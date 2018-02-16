function fullUrl(url) {
  const location = window.location;

  const scheme = location.protocol.toLowerCase();
  const host = location.host;

  return scheme + '//' + host + url;
}

export default function init(ngModule) {
  ngModule.factory('Utils', () => ({
    fullUrl,
  }));
}
