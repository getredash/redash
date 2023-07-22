import { isObject, isArray, reduce, keys, uniq } from "lodash";
import L from "leaflet";

export function getGeoJsonFields(geoJson: any) {
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'features' does not exist on type 'object... Remove this comment to see the full error message
  const features = isObject(geoJson) && isArray(geoJson.features) ? geoJson.features : [];
  return reduce(
    features,
    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
    (result, feature) => {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'properties' does not exist on type 'obje... Remove this comment to see the full error message
      const properties = isObject(feature) && isObject(feature.properties) ? feature.properties : {};
      return uniq([...result, ...keys(properties)]);
    },
    []
  );
}

export function getGeoJsonBounds(geoJson: any) {
  if (isObject(geoJson)) {
    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'object' is not assignable to par... Remove this comment to see the full error message
    const layer = L.geoJSON(geoJson);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      return [
        // @ts-expect-error ts-migrate(2551) FIXME: Property '_southWest' does not exist on type 'LatL... Remove this comment to see the full error message
        [bounds._southWest.lat, bounds._southWest.lng],
        // @ts-expect-error ts-migrate(2551) FIXME: Property '_northEast' does not exist on type 'LatL... Remove this comment to see the full error message
        [bounds._northEast.lat, bounds._northEast.lng],
      ];
    }
  }
  return null;
}
