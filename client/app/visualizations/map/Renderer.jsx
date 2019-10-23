import { isEqual, pick, omit, merge } from 'lodash';
import React, { useState, useEffect, useRef } from 'react';
import resizeObserver from '@/services/resizeObserver';
import { RendererPropTypes } from '@/visualizations';

import initMap from './initMap';

function useSplitObject(object, fields) {
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  const left = pick(object, fields);
  const right = omit(object, fields);

  if (!isEqual(leftRef.current, left)) {
    leftRef.current = left;
  }
  if (!isEqual(rightRef.current, right)) {
    rightRef.current = right;
  }

  return [left, right];
}

export default function Renderer({ data, options, onOptionsChange }) {
  const [container, setContainer] = useState(null);
  const [map, setMap] = useState(null);

  const [bounds, restOptions] = useSplitObject(options, ['bounds']);

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

  useEffect(() => {
    if (map) {
      map.render(data, options);
    }
  }, [map, data, restOptions]);

  useEffect(() => {
    if (map) {
      map.updateBounds(options.bounds);
    }
  }, [map, bounds]);

  useEffect(() => {
    if (map) {
      map.onOptionsChange = (newOptions) => {
        onOptionsChange(merge({}, options, newOptions));
      };
    }
  }, [map, options, onOptionsChange]);

  return (<div className="map-visualization-container" ref={setContainer} />);
}

Renderer.propTypes = RendererPropTypes;
