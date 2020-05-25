import { omit, merge, get } from "lodash";
import axios from "axios";
import React, { useState, useEffect } from "react";
import { RendererPropTypes } from "@/visualizations/prop-types";
import useMemoWithDeepCompare from "@/lib/hooks/useMemoWithDeepCompare";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

import initChoropleth from "./initChoropleth";
import { prepareData } from "./utils";
import "./renderer.less";

function getDataUrl(type) {
  return get(visualizationsSettings, `choroplethAvailableMaps.${type}.url`, undefined);
}

export default function Renderer({ data, options, onOptionsChange }) {
  const [container, setContainer] = useState(null);
  const [geoJson, setGeoJson] = useState(null);

  const optionsWithoutBounds = useMemoWithDeepCompare(() => omit(options, ["bounds"]), [options]);

  const [map, setMap] = useState(null);

  useEffect(() => {
    let cancelled = false;

    axios.get(getDataUrl(options.mapType)).then(({ data }) => {
      if (!cancelled) {
        setGeoJson(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [options.mapType]);

  useEffect(() => {
    if (container) {
      const _map = initChoropleth(container);
      setMap(_map);
      return () => {
        _map.destroy();
      };
    }
  }, [container]);

  useEffect(() => {
    if (map) {
      map.updateLayers(
        geoJson,
        prepareData(data.rows, optionsWithoutBounds.countryCodeColumn, optionsWithoutBounds.valueColumn),
        options // detect changes for all options except bounds, but pass them all!
      );
    }
  }, [map, geoJson, data.rows, optionsWithoutBounds]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (map) {
      map.updateBounds(options.bounds);
    }
  }, [map, options.bounds]);

  useEffect(() => {
    if (map && onOptionsChange) {
      map.onBoundsChange = bounds => {
        onOptionsChange(merge({}, options, { bounds }));
      };
    }
  }, [map, options, onOptionsChange]);

  return (
    <div className="map-visualization-container" style={{ background: options.colors.background }} ref={setContainer} />
  );
}

Renderer.propTypes = RendererPropTypes;
