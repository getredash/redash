import { isObject, isArray, reduce, keys, uniq } from "lodash";
import L from "leaflet";

// Define interfaces for GeoJSON types
interface GeoJsonProperties {
  [key: string]: any;
}

interface GeoJsonFeature {
  type: string;
  properties: GeoJsonProperties | null;
  geometry: any; // Can be more specific if needed
}

interface GeoJsonFeatureCollection {
  type: string;
  features: GeoJsonFeature[];
}

export function getGeoJsonFields(geoJson: GeoJsonFeatureCollection | any) {
  // Use a more specific check for FeatureCollection
  const features = geoJson && geoJson.type === "FeatureCollection" && isArray(geoJson.features) ? geoJson.features : [];
  return reduce(
    features,
    (result: string[], feature: GeoJsonFeature) => {
      const properties = isObject(feature) && isObject(feature.properties) ? feature.properties : {};
      return uniq([...result, ...keys(properties)]);
    },
    []
  );
}

export function getGeoJsonBounds(geoJson: GeoJsonFeatureCollection | any) {
  if (isObject(geoJson)) {
    // L.geoJSON can accept various GeoJSON object types, keep 'any' here for flexibility
    // or use a broader GeoJSON type if available/installed.
    const layer = L.geoJSON(geoJson as any);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      return [
        [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
        [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
      ];
    }
  }
  return null;
}
