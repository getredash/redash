const PREFIX = 'localOptions:';

export function get(key, defaultValue = undefined) {
  const fullKey = PREFIX + key;
  if (fullKey in window.localStorage) {
    return JSON.parse(window.localStorage.getItem(fullKey));
  }
  return defaultValue;
}

export function set(key, value) {
  const fullKey = PREFIX + key;
  window.localStorage.setItem(fullKey, JSON.stringify(value));
}
