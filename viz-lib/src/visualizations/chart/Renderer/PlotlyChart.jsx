import React, { useState, useEffect, useContext, useRef } from "react";
import useMedia from "use-media";
import { ErrorBoundaryContext } from "@/components/ErrorBoundary";
import { RendererPropTypes } from "@/visualizations/prop-types";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";
import getChartData from "../getChartData";
import initChart from "./initChart";

export default function PlotlyChart({ options, data, visualization, onSuccess }) {
  const [container, setContainer] = useState(null);
  const [chart, setChart] = useState(null);

  const errorHandler = useContext(ErrorBoundaryContext);
  const errorHandlerRef = useRef();
  errorHandlerRef.current = errorHandler;

  const isMobile = useMedia({ maxWidth: 768 });
  const isMobileRef = useRef();
  isMobileRef.current = isMobile;

  useEffect(() => {
    if (container) {
      let isDestroyed = false;

      const chartData = getChartData(data.rows, options);
      const _chart = initChart(
        container,
        options,
        chartData,
        visualizationsSettings,
        visualization,
        onSuccess,
        error => {
          errorHandlerRef.current.handleError(error);
        }
      );
      _chart.initialized.then(() => {
        if (!isDestroyed) {
          setChart(_chart);
        }
      });
      return () => {
        isDestroyed = true;
        _chart.destroy();
      };
    }
  }, [options, data, container]);

  useEffect(() => {
    if (chart) {
      chart.setZoomEnabled(!isMobile);
    }
  }, [chart, isMobile]);

  return <div className="chart-visualization-container" ref={setContainer} />;
}

PlotlyChart.propTypes = RendererPropTypes;
