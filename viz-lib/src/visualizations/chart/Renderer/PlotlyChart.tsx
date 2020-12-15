import React, { useState, useEffect, useContext, useRef } from "react";
import useMedia from "use-media";
import { ErrorBoundaryContext } from "@/components/ErrorBoundary";
import { RendererPropTypes } from "@/visualizations/prop-types";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";
import getChartData from "../getChartData";
import initChart from "./initChart";

export interface PlotlyChartProps {
  data: {
    rows: any[];
    columns: any[];
  }
  options: object;
}

export default function PlotlyChart({
  options,
  data
}: PlotlyChartProps) {
  const [container, setContainer] = useState(null);
  const [chart, setChart] = useState(null);

  const errorHandler = useContext(ErrorBoundaryContext);
  const errorHandlerRef = useRef();
  // @ts-expect-error ts-migrate(2322) FIXME: Type '{ handleError: (error: any) => void; reset: ... Remove this comment to see the full error message
  errorHandlerRef.current = errorHandler;

  const isMobile = useMedia({ maxWidth: 768 });
  const isMobileRef = useRef();
  // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'undefine... Remove this comment to see the full error message
  isMobileRef.current = isMobile;

  useEffect(() => {
    if (container) {
      let isDestroyed = false;

      const chartData = getChartData(data.rows, options);
      const _chart = initChart(container, options, chartData, visualizationsSettings, (error: any) => {
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        errorHandlerRef.current.handleError(error);
      });
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
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
      chart.setZoomEnabled(!isMobile);
    }
  }, [chart, isMobile]);

  // @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<null>>' is not assig... Remove this comment to see the full error message
  return <div className="chart-visualization-container" ref={setContainer} />;
}

PlotlyChart.propTypes = RendererPropTypes;
