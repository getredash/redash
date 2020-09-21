import { isString, isObject, get } from "lodash";
import { useState, useEffect } from "react";
import axios from "axios";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";
import createReferenceCountingCache from "@/lib/referenceCountingCache";

const defaultGeoJson = {
  type: "FeatureCollection",
  features: [],
};

const cache = createReferenceCountingCache();

export default function useLoadGeoJson(mapType) {
  const [geoJson, setGeoJson] = useState(defaultGeoJson);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const mapUrl = get(visualizationsSettings, `choroplethAvailableMaps.${mapType}.url`, undefined);

    if (isString(mapUrl)) {
      setIsLoading(true);
      let cancelled = false;

      const promise = cache.get(mapUrl, () => axios.get(mapUrl).catch(() => defaultGeoJson));
      promise.then(({ data }) => {
        if (!cancelled) {
          setGeoJson(isObject(data) ? data : defaultGeoJson);
          setIsLoading(false);
        }
      });

      return () => {
        cancelled = true;
        cache.release(mapUrl);
      };
    } else {
      setGeoJson(defaultGeoJson);
      setIsLoading(false);
    }
  }, [mapType]);

  return [geoJson, isLoading];
}
