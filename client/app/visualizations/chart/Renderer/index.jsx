import React from 'react';
import { RendererPropTypes } from '@/visualizations';

import PlotlyChart from './PlotlyChart';
import CustomPlotlyChart from './CustomPlotlyChart';

export default function Renderer({ options, ...props }) {
  if (options.globalSeriesType === 'custom') {
    return <CustomPlotlyChart options={options} {...props} />;
  }
  return <PlotlyChart options={options} {...props} />;
}

Renderer.propTypes = RendererPropTypes;
