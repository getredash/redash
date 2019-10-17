import { find } from 'lodash';
import React, { useState, useEffect, useCallback } from 'react';
import resizeObserver from '@/services/resizeObserver';
import { RendererPropTypes } from '@/visualizations';

import renderSankey from './renderSankey';

function isDataValid(data) {
  // data should contain column named 'value', otherwise no reason to render anything at all
  return data && !!find(data.columns, c => c.name === 'value');
}

export default function Renderer({ data }) {
  const [container, setContainer] = useState(null);

  const render = useCallback(() => {
    if (isDataValid(data)) {
      renderSankey(container, data.rows);
    }
  }, [container, data]);

  useEffect(() => {
    if (container) {
      render();
      const unwatch = resizeObserver(container, render);
      return unwatch;
    }
  }, [container, render]);

  return (<div className="sankey-visualization-container" ref={setContainer} />);
}

Renderer.propTypes = RendererPropTypes;
