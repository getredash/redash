import qs from 'qs';
import _ from 'lodash';

const prefix = 'p_';
const options = { allowDots: true, ignoreQueryPrefix: true };

const parse = queryString => qs.parse(queryString, options);
const stringify = obj => qs.stringify(obj, options);
const onlyParameters = ([k]) => k.startsWith(prefix);
const removePrefix = ([k, v]) => [k.slice(prefix.length), v];
const addPrefix = ([k, v]) => [`${prefix}${k}`, v];
const toObject = (obj, [k, v]) => Object.assign(obj, { [k]: v });

const fromString = (queryString) => {
  const obj = parse(queryString);
  const entries = Object.entries(obj);
  const [queryParameters, rest] = _.partition(entries, onlyParameters);

  return {
    queryParameters: { ...queryParameters.map(removePrefix).reduce(toObject, {}) },
    ...rest.reduce(toObject, {}),
  };
};

const fromUrl = () => fromString(location.search);

const toString = (obj) => {
  let { queryParameters, ...rest } = obj;

  queryParameters = Object.entries(queryParameters || {})
    .map(addPrefix);
  rest = Object.entries(rest, {});

  return stringify(queryParameters
    .concat(rest)
    .reduce(toObject, {}), options);
};

export default {
  fromString,
  fromUrl,
  toString,
};
