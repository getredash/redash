/* eslint-disable import/prefer-default-export */

import { isObject, isArray, reduce, keys, uniq } from "lodash";

export function getGeoJsonFields(geoJson) {
  const features = isObject(geoJson) && isArray(geoJson.features) ? geoJson.features : [];
  return reduce(
    features,
    (result, feature) => {
      const properties = isObject(feature) && isObject(feature.properties) ? feature.properties : {};
      return uniq([...result, ...keys(properties)]);
    },
    []
  );
}
