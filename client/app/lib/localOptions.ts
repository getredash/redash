const PREFIX = "localOptions:";

function get(key: any, defaultValue = undefined) {
  const fullKey = PREFIX + key;
  if (fullKey in window.localStorage) {
    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string | null' is not assignable... Remove this comment to see the full error message
    return JSON.parse(window.localStorage.getItem(fullKey));
  }
  return defaultValue;
}

function set(key: any, value: any) {
  const fullKey = PREFIX + key;
  window.localStorage.setItem(fullKey, JSON.stringify(value));
}

export default {
  get,
  set,
};
