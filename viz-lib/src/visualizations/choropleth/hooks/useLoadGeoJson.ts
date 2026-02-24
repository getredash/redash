import { isString, isObject, get } from "lodash";
import { useState, useEffect } from "react";
import axios from "axios";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";
import createReferenceCountingCache from "@/lib/referenceCountingCache";

const cache = createReferenceCountingCache();

function resolveMapUrl(mapType: any, customMapUrl: any): string | undefined {
  if (mapType === "custom" && isString(customMapUrl) && customMapUrl.length > 0) {
    return customMapUrl;
  }
  return get(visualizationsSettings, `choroplethAvailableMaps.${mapType}.url`, undefined);
}

function extractErrorMessage(error: any): string {
  if (error && error.message) {
    return error.message;
  }
  return "Failed to load GeoJSON. Ensure the URL is correct and the server allows cross-origin requests (CORS).";
}

export default function useLoadGeoJson(mapType: any, customMapUrl?: any) {
  const [geoJson, setGeoJson] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const mapUrl = resolveMapUrl(mapType, customMapUrl);

    if (isString(mapUrl)) {
      setIsLoading(true);
      setLoadError(null);
      let cancelled = false;

      const isCustomUrl = mapType === "custom";

      const promise = cache.get(mapUrl, () => axios.get(mapUrl));
      promise.then(
        (result: any) => {
          if (!cancelled) {
            const data = result ? result.data : null;
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'object | null' is not assignable... Remove this comment to see the full error message
            setGeoJson(isObject(data) ? data : null);
            setLoadError(null);
            setIsLoading(false);
          }
        },
        (err: any) => {
          if (!cancelled) {
            setGeoJson(null);
            setLoadError(isCustomUrl ? extractErrorMessage(err) : null);
            setIsLoading(false);
            // Evict failed entry so the next attempt retries
            cache.release(mapUrl);
          }
        }
      );

      return () => {
        cancelled = true;
        cache.release(mapUrl);
      };
    } else {
      setGeoJson(null);
      setLoadError(null);
      setIsLoading(false);
    }
  }, [mapType, customMapUrl]);

  return [geoJson, isLoading, loadError];
}
