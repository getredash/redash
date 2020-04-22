import { isString, isObject, find } from "lodash";
import { useState, useEffect } from "react";
import { axios } from "@/services/axios";
import createReferenceCountingCache from "@/lib/referenceCountingCache";
import maps from "../maps";

const cache = createReferenceCountingCache();

function withProxy(url) {
  // if it's one of predefined maps - use it directly
  if (find(maps, map => map.url === url)) {
    return url;
  }
  return `/api/resource-proxy?url=${encodeURIComponent(url)}`;
}

export default function useLoadGeoJson(url) {
  const [geoJson, setGeoJson] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isString(url)) {
      setIsLoading(true);
      let cancelled = false;

      const promise = cache.get(url, () => axios.get(withProxy(url)).catch(() => null));
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
