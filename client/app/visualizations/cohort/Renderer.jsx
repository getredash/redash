import React, { useMemo } from 'react';
import { RendererPropTypes } from '@/visualizations';

import prepareData from './prepareData';
import './renderer.less';

import Cornelius from './Cornelius';

export default function Renderer({ data, options }) {
  const { data: cohortData, initialDate } = useMemo(() => prepareData(data, options), [data, options]);

  if (cohortData.length === 0) {
    return null;
  }

  return (
    <div className="cohort-visualization-container">
      <Cornelius data={cohortData} initialDate={initialDate} timeInterval={options.timeInterval} />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
