import { isEqual, omit, merge } from "lodash";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { RendererPropTypes } from "@/visualizations";

import prepareData from "./prepareData";
import initMap from "./initMap";

function useMemoWithDeepCompare(create, inputs) {
  const valueRef = useRef();
  const value = useMemo(create, inputs);
  if (!isEqual(value, valueRef.current)) {
    valueRef.current = value;
  }
  return valueRef.current;
}

export default function Renderer({ data, options, onOptionsChange }) {
  const [container, setContainer] = useState(null);

  const optionsWithoutBounds = useMemoWithDeepCompare(() => omit(options, ["bounds"]), [options]);

  const groups = useMemo(() => prepareData(data, optionsWithoutBounds), [data, optionsWithoutBounds]);

  const [map, setMap] = useState(null);

  useEffect(() => {
    if (container) {
      const _map = initMap(container);
      setMap(_map);
      return () => {
        _map.destroy();
      };
    }
  }, [container]);

  useEffect(() => {
    if (map) {
      map.updateLayers(groups, optionsWithoutBounds);
    }
  }, [map, groups, optionsWithoutBounds]);

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

  return <div className="map-visualization-container" ref={setContainer} />;
}

Renderer.propTypes = RendererPropTypes;
