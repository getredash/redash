import React, { useState, useEffect } from 'react';
import resizeObserver from '@/services/resizeObserver';
import { RendererPropTypes } from '@/visualizations';

import initMap from './initMap';

export default function Renderer({ data, options }) {
  const [container, setContainer] = useState(null);
  const [map, setMap] = useState(null);

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
  }, [map, data, options]); // TODO: it should watch all options except of `bounds`

  useEffect(() => {
    if (map) {
      map.updateBounds(options.bounds);
    }
  }, [map, options.bounds]);

  return (<div className="map-visualization-container" ref={setContainer} />);
}

Renderer.propTypes = RendererPropTypes;
