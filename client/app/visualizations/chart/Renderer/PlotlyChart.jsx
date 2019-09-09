import { isArray, isObject } from 'lodash';
import React, { useState, useEffect, useMemo } from 'react';
import { RendererPropTypes } from '@/visualizations';
import resizeObserver from '@/services/resizeObserver';

import getChartData from '../getChartData';
import { Plotly, prepareData, prepareLayout, updateData, applyLayoutFixes } from '../plotly';

export default function PlotlyChart(props) {
  const [container, setContainer] = useState(null);

  const options = useMemo(() => {
    const result = { ...props.options };
    if (['normal', 'percent'].indexOf(result.series.stacking) >= 0) {
      // Backward compatibility
      result.series = {
        ...result.series,
        percentValues: result.series.stacking === 'percent',
        stacking: 'stack',
      };
    }
    return result;
  }, [props.options]);

  const plotlyData = useMemo(() => {
    const series = getChartData(props.data.rows, options);
    return prepareData(series, options);
  }, [props.data, options]);

  const plotlyLayout = useMemo(() => {
    if (container) {
      return prepareLayout(container, options, plotlyData);
    }
    return null;
  }, [container, options, plotlyData]);

  useEffect(() => {
    if (container && plotlyLayout) {
      const plotlyOptions = { showLink: false, displaylogo: false };

      // It will auto-purge previous graph
      Plotly.newPlot(container, plotlyData, plotlyLayout, plotlyOptions).then(() => {
        applyLayoutFixes(container, plotlyLayout, (e, u) => Plotly.relayout(e, u));
      });

      container.on('plotly_restyle', (updates) => {
        // This event is triggered if some plotly data/layout has changed.
        // We need to catch only changes of traces visibility to update stacking
        if (isArray(updates) && isObject(updates[0]) && updates[0].visible) {
          updateData(plotlyData, options);
          Plotly.relayout(container, plotlyLayout);
        }
      });
    }
  }, [options, plotlyData, plotlyLayout, container]);

  useEffect(() => {
    if (container) {
      const unwatch = resizeObserver(container, () => {
        applyLayoutFixes(container, plotlyLayout, (e, u) => Plotly.relayout(e, u));
      });
      return unwatch;
    }
  }, [plotlyLayout, container]);

  return <div className="chart-visualization-container plotly-chart-container" ref={setContainer} />;
}

PlotlyChart.propTypes = RendererPropTypes;
