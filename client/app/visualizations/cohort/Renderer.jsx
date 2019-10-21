import React, { useMemo } from 'react';
import { RendererPropTypes } from '@/visualizations';

import prepareData from './prepareData';
import './renderer.less';

import Cornelius from './Cornelius';

export default function Renderer({ data, options }) {
  const { data: cohortData, initialDate } = useMemo(() => prepareData(data, options), [data, options]);

  const corneliusOptions = useMemo(() => ({
    initialDate,
    timeInterval: options.timeInterval,
    labels: {
      time: 'Time',
      people: 'Users',
      weekOf: 'Week of',
    },
  }), [options, initialDate]);

  if (cohortData.length === 0) {
    return null;
  }

  return (
    <div className="cohort-visualization-container">
      <Cornelius data={cohortData} options={corneliusOptions} />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
