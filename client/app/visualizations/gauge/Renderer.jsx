import { find } from 'lodash';
import React, { useState, useEffect } from 'react';
import { RendererPropTypes } from '@/visualizations';

import createGauge from './utils';
import './gauge.less';

function isDataValid(data) {
  // data should contain column named 'value', otherwise no reason to render anything at all
  return (data.rows.length > 0) && find(data.columns, c => c.name === 'value');
}

export default function Renderer({ data, options }) {
  const [container, setContainer] = useState(null);

  useEffect(() => {
    if (container && isDataValid(data)) {
      createGauge(container, data.rows, options);
    }
  }, [container, data, options]);

  return <div className="power-gauge" ref={setContainer} />;
}

Renderer.propTypes = RendererPropTypes;
