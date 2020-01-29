import { isString, isObject } from "lodash";
import { useState, useEffect } from "react";
import { axios } from "@/services/axios";

const defaultGeoJson = {
  type: "FeatureCollection",
  features: [],
};

// TODO: It needs some cache
export default function useLoadGeoJson(url) {
  const [geoJson, setGeoJson] = useState(defaultGeoJson);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isString(url)) {
      setIsLoading(true);
      let cancelled = false;
      axios
        .get(url)
        .catch(() => defaultGeoJson)
        .then(data => {
          if (!cancelled) {
            setGeoJson(isObject(data) ? data : defaultGeoJson);
            setIsLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    } else {
      setGeoJson(defaultGeoJson);
      setIsLoading(false);
    }
  }, [url]);

  return [geoJson, isLoading];
}
