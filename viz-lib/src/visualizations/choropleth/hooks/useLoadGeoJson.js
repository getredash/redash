import { isString, isObject, get } from "lodash";
import { useState, useEffect } from "react";
import axios from "axios";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

const defaultGeoJson = {
  type: "FeatureCollection",
  features: [],
};

// TODO: It needs some cache
export default function useLoadGeoJson(mapType) {
  const [geoJson, setGeoJson] = useState(defaultGeoJson);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const mapUrl = get(visualizationsSettings, `choroplethAvailableMaps.${mapType}.url`, undefined);

    if (isString(mapUrl)) {
      setIsLoading(true);
      let cancelled = false;
      axios
        .get(mapUrl)
        .catch(() => defaultGeoJson)
        .then(({ data }) => {
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
  }, [mapType]);

  return [geoJson, isLoading];
}
