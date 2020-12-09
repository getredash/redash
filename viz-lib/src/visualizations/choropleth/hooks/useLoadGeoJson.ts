import { isString, isObject, get } from "lodash";
import { useState, useEffect } from "react";
import axios from "axios";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";
import createReferenceCountingCache from "@/lib/referenceCountingCache";

const cache = createReferenceCountingCache();

export default function useLoadGeoJson(mapType: any) {
  const [geoJson, setGeoJson] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const mapUrl = get(visualizationsSettings, `choroplethAvailableMaps.${mapType}.url`, undefined);

    if (isString(mapUrl)) {
      setIsLoading(true);
      let cancelled = false;

      const promise = cache.get(mapUrl, () => axios.get(mapUrl).catch(() => null));
      promise.then(({
        data
      }: any) => {
        if (!cancelled) {
          // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'object | null' is not assignable... Remove this comment to see the full error message
          setGeoJson(isObject(data) ? data : null);
          setIsLoading(false);
        }
      });

      return () => {
        cancelled = true;
        cache.release(mapUrl);
      };
    } else {
      setGeoJson(null);
      setIsLoading(false);
    }
  }, [mapType]);

  return [geoJson, isLoading];
}
