import { omit, noop } from "lodash";
import React, { useState, useEffect, useRef } from "react";
import { RendererPropTypes } from "@/visualizations/prop-types";
import useMemoWithDeepCompare from "@/lib/hooks/useMemoWithDeepCompare";

import useLoadGeoJson from "../hooks/useLoadGeoJson";
import initChoropleth from "./initChoropleth";
import { prepareData } from "./utils";
import "./renderer.less";

export default function Renderer({ data, options, onOptionsChange }) {
  const [container, setContainer] = useState(null);
  const [geoJson] = useLoadGeoJson(options.mapType);
  const onBoundsChangeRef = useRef();
  onBoundsChangeRef.current = onOptionsChange ? bounds => onOptionsChange({ ...options, bounds }) : noop;

  const optionsWithoutBounds = useMemoWithDeepCompare(() => omit(options, ["bounds"]), [options]);

  const [map, setMap] = useState(null);

  useEffect(() => {
    if (container) {
      const _map = initChoropleth(container, (...args) => onBoundsChangeRef.current(...args));
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
  }, [map, geoJson, data.rows, optionsWithoutBounds]); // eslint-disable-line react-hooks/exhaustive-deps

  // This may come only from editor
  useEffect(() => {
    if (map) {
      map.updateBounds(options.bounds);
    }
  }, [map, options, onOptionsChange]);

  return (
    <div className="map-visualization-container" style={{ background: options.colors.background }} ref={setContainer} />
  );
}

Renderer.propTypes = RendererPropTypes;
