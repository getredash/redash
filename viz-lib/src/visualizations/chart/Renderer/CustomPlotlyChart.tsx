import React, { useState, useEffect, useMemo } from "react";
import { RendererPropTypes } from "@/visualizations/prop-types";

import resizeObserver from "@/services/resizeObserver";

import getChartData from "../getChartData";
import { Plotly, prepareCustomChartData, createCustomChartRenderer } from "../plotly";

export default function CustomPlotlyChart({
  options,
  data
}: any) {
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
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
        Plotly.purge(container);
        renderCustomChart(plotlyData.x, plotlyData.ys, container, Plotly);
      });
      return unwatch;
    }
  }, [container, plotlyData, renderCustomChart]);

  // Cleanup when component destroyed
  useEffect(() => {
    if (container) {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
      return () => Plotly.purge(container);
    }
  }, [container]);

  // @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<null>>' is not assig... Remove this comment to see the full error message
  return <div className="chart-visualization-container" ref={setContainer} />;
}

CustomPlotlyChart.propTypes = RendererPropTypes;
