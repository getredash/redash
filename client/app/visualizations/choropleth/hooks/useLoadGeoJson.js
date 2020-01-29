import { isString, isObject } from "lodash";
import { useState, useEffect } from "react";
import { axios } from "@/services/axios";
import createReferenceCountingCache from "@/lib/referenceCountingCache";

const cache = createReferenceCountingCache();

export default function useLoadGeoJson(url) {
  const [geoJson, setGeoJson] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isString(url)) {
      setIsLoading(true);
      let cancelled = false;

      const promise = cache.get(url, () => axios.get(url).catch(() => null));
      promise.then(data => {
        if (!cancelled) {
          setGeoJson(isObject(data) ? data : null);
          setIsLoading(false);
        }
      });

      return () => {
        cancelled = true;
        cache.release(url);
      };
    } else {
      setGeoJson(null);
      setIsLoading(false);
    }
  }, [url]);

  return [geoJson, isLoading];
}
