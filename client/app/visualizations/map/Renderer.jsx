import { isEqual, omit, merge } from 'lodash';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import resizeObserver from '@/services/resizeObserver';
import { RendererPropTypes } from '@/visualizations';

import prepareData from './prepareData';
import initMap from './initMap';

function useMemoWithDeepCompare(getter, dependencies) {
  const valueRef = useRef();
  const value = useMemo(getter, dependencies);
  if (!isEqual(value, valueRef.current)) {
    valueRef.current = value;
  }
  return valueRef.current;
}

export default function Renderer({ data, options, onOptionsChange }) {
  const [container, setContainer] = useState(null);
  const [map, setMap] = useState(null);
  const optionsWithoutBounds = useMemoWithDeepCompare(
    () => omit(options, ['bounds']),
    [options],
  );
  const groups = useMemo(() => prepareData(data, optionsWithoutBounds), [data, optionsWithoutBounds]);

  useEffect(() => {
    if (container) {
      const m = initMap(container);
      setMap(m);
      const unwatch = resizeObserver(container, () => { m.resize(); });
      return () => {
        unwatch();
        m.destroy();
      };
    }
  }, [container]);

  // Here we need to watch for all options except of bounds, but supply all options to `render()`;
  // bounds will be handled by another hook
  useEffect(() => {
    if (map) {
      map.render(groups, options);
    }
  }, [map, groups, optionsWithoutBounds]);

  useEffect(() => {
    if (map) {
      map.updateBounds(options.bounds);
    }
  }, [map, options.bounds]);

  useEffect(() => {
    if (map && onOptionsChange) {
      map.onOptionsChange = (newOptions) => {
        onOptionsChange(merge({}, options, newOptions));
      };
    }
  }, [map, options, onOptionsChange]);

  return (<div className="map-visualization-container" ref={setContainer} />);
}

Renderer.propTypes = RendererPropTypes;
