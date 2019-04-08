import qs from 'qs';

const prefix = 'p_';
const options = { allowDots: true, ignoreQueryPrefix: true };

const parse = queryString => qs.parse(queryString, options);
const onlyParameters = ([k]) => k.startsWith(prefix);
const removePrefix = ([k, v]) => [k.slice(prefix.length), v];
const addPrefix = ([k, v]) => [`${prefix}${k}`, v];
const toObject = (obj, [k, v]) => Object.assign(obj, { [k]: v });

const fromString = queryString => Object.entries(parse(queryString))
  .filter(onlyParameters)
  .map(removePrefix)
  .reduce(toObject, {});

const fromUrl = () => fromString(location.search);

export default {
  fromString,
  fromUrl,
};
