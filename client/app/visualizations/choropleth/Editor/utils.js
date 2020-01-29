import { isObject, isArray, reduce, keys, uniq } from "lodash";
import L from "leaflet";

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

export function getGeoJsonBounds(geoJson) {
  if (isObject(geoJson)) {
    const layer = L.geoJSON(geoJson);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      return [
        [bounds._southWest.lat, bounds._southWest.lng],
        [bounds._northEast.lat, bounds._northEast.lng],
      ];
    }
  }
  return null;
}
