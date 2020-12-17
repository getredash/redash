// eslint-disable-next-line import/prefer-default-export
export function absoluteUrl(url: any) {
  // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'Location' is not assignable to p... Remove this comment to see the full error message
  const urlObj = new URL(url, window.location);
  urlObj.protocol = window.location.protocol;
  urlObj.host = window.location.host;
  return urlObj.toString();
}
