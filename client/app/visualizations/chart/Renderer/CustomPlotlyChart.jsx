import React, { useState, useEffect, useMemo } from "react";
import { RendererPropTypes } from "@/visualizations";

import resizeObserver from "@/services/resizeObserver";

import getChartData from "../getChartData";
import { Plotly, prepareCustomChartData, createCustomChartRenderer } from "../plotly";

export default function CustomPlotlyChart({ options, data }) {
  const [container, setContainer] = useState(null);

  const renderCustomChart = useMemo(() => createCustomChartRenderer(options.customCode, options.enableConsoleLogs), [
    options.customCode,
    options.enableConsoleLogs,
  ]);

  const plotlyData = useMemo(() => prepareCustomChartData(getChartData(data.rows, options)), [options, data]);

  useEffect(() => {
    if (container) {
      const unwatch = resizeObserver(container, () => {
        // Clear existing data with blank data for succeeding codeCall adds data to existing plot.
        Plotly.purge(container);
        renderCustomChart(plotlyData.x, plotlyData.ys, container, Plotly);
      });
      return unwatch;
    }
  }, [container, plotlyData, renderCustomChart]);

  // Cleanup when component destroyed
  useEffect(() => {
    if (container) {
      return () => Plotly.purge(container);
    }
  }, [container]);

  return <div className="chart-visualization-container" ref={setContainer} />;
}

CustomPlotlyChart.propTypes = RendererPropTypes;
