function fullUrl($location, url) {
  const scheme = $location.protocol().toLowerCase();
  const defaultPort = scheme === 'https' ? 443 : 80;
  const host = $location.host();
  const port = parseInt($location.port(), 10);

  let result = scheme + '://' + host;
  if (port !== defaultPort) {
    result = result + ':' + port;
  }
  return result + url;
}

export default function init(ngModule) {
  ngModule.factory('Utils', $location => ({
    fullUrl: url => fullUrl($location, url),
  }));
}
