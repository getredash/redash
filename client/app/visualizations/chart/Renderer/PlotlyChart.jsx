import { isArray, isObject } from "lodash";
import React, { useState, useEffect, useContext } from "react";
import { ErrorBoundaryContext } from "@/components/ErrorBoundary";
import { RendererPropTypes } from "@/visualizations";
import resizeObserver from "@/services/resizeObserver";

import getChartData from "../getChartData";
import { Plotly, prepareData, prepareLayout, updateData, applyLayoutFixes } from "../plotly";

function catchErrors(func, errorHandler) {
  return (...args) => {
    try {
      return func(...args);
    } catch (error) {
      errorHandler.handleError(error);
    }
  };
}

export default function PlotlyChart({ options, data }) {
  const [container, setContainer] = useState(null);
  const errorHandler = useContext(ErrorBoundaryContext);

  useEffect(
    catchErrors(() => {
      if (container) {
        const plotlyOptions = { showLink: false, displaylogo: false };

        const chartData = getChartData(data.rows, options);
        const plotlyData = prepareData(chartData, options);
        const plotlyLayout = prepareLayout(container, options, plotlyData);

        // It will auto-purge previous graph
        Plotly.newPlot(container, plotlyData, plotlyLayout, plotlyOptions).then(
          catchErrors(() => {
            applyLayoutFixes(container, plotlyLayout, (e, u) => Plotly.relayout(e, u));
          }, errorHandler)
        );

        container.on(
          "plotly_restyle",
          catchErrors(updates => {
            // This event is triggered if some plotly data/layout has changed.
            // We need to catch only changes of traces visibility to update stacking
            if (isArray(updates) && isObject(updates[0]) && updates[0].visible) {
              updateData(plotlyData, options);
              Plotly.relayout(container, plotlyLayout);
            }
          }, errorHandler)
        );

        const unwatch = resizeObserver(
          container,
          catchErrors(() => {
            applyLayoutFixes(container, plotlyLayout, (e, u) => Plotly.relayout(e, u));
          }, errorHandler)
        );
        return unwatch;
      }
    }, errorHandler),
    [options, data, container]
  );

  // Cleanup when component destroyed
  useEffect(() => {
    if (container) {
      return () => Plotly.purge(container);
    }
  }, [container]);

  return <div className="chart-visualization-container" ref={setContainer} />;
}

PlotlyChart.propTypes = RendererPropTypes;
