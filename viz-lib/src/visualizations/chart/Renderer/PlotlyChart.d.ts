import React from "react";
export interface PlotlyChartProps {
  data: {
    rows: any[];
    columns: any[];
  }
  options: object;
}
declare const PlotlyChart: React.FC<PlotlyChartProps>;
export default PlotlyChart;
