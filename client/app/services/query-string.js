import qs from 'qs';

const parse = queryString => qs.parse(queryString, { allowDots: true, ignoreQueryPrefix: true });
const onlyParameters = ([k]) => k.startsWith('p_');
const removePrefix = ([k, v]) => [k.slice(2), v];
const toObject = (obj, [k, v]) => Object.assign(obj, { [k]: v });

export default () => Object.entries(parse(location.search))
  .filter(onlyParameters)
  .map(removePrefix)
  .reduce(toObject, {});
