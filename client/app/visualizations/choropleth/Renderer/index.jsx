import { omit, merge } from "lodash";
import React, { useState, useEffect } from "react";
import { RendererPropTypes } from "@/visualizations/prop-types";
import useMemoWithDeepCompare from "@/lib/hooks/useMemoWithDeepCompare";

import useLoadGeoJson from "../hooks/useLoadGeoJson";
import { getMapUrl } from "../maps";
import initChoropleth from "./initChoropleth";
import { prepareData } from "./utils";
import "./renderer.less";

export default function Renderer({ data, options, onOptionsChange }) {
  const [container, setContainer] = useState(null);
  const [geoJson, isLoadingGeoJson] = useLoadGeoJson(getMapUrl(options.mapType, options.customMapUrl));

  const optionsWithoutBounds = useMemoWithDeepCompare(() => omit(options, ["bounds"]), [options]);

  const [map, setMap] = useState(null);

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
        prepareData(data.rows, optionsWithoutBounds.keyColumn, optionsWithoutBounds.valueColumn),
        options // detect changes for all options except bounds, but pass them all!
      );
    }
  }, [map, geoJson, data, optionsWithoutBounds]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (map && !isLoadingGeoJson) {
      map.updateBounds(options.bounds);
    }
  }, [map, isLoadingGeoJson, options.bounds]);

  useEffect(() => {
    if (map && onOptionsChange && !isLoadingGeoJson) {
      map.onBoundsChange = bounds => {
        onOptionsChange(merge({}, options, { bounds }));
      };
    }
  }, [map, isLoadingGeoJson, options, onOptionsChange]);

  return (
    <div className="map-visualization-container" style={{ background: options.colors.background }} ref={setContainer} />
  );
}

Renderer.propTypes = RendererPropTypes;
