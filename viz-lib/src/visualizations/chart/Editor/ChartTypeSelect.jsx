import { filter, includes, map } from "lodash";
import React, { useMemo } from "react";
import { Select } from "@/components/visualizations/editor";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

export default function ChartTypeSelect({ hiddenChartTypes, ...props }) {
  const chartTypes = useMemo(() => {
    const result = [
      { type: "line", name: "Line", icon: "line-chart" },
      { type: "column", name: "Bar", icon: "bar-chart" },
      { type: "area", name: "Area", icon: "area-chart" },
      { type: "pie", name: "Pie", icon: "pie-chart" },
      { type: "scatter", name: "Scatter", icon: "circle-o" },
      { type: "bubble", name: "Bubble", icon: "circle-o" },
      { type: "heatmap", name: "Heatmap", icon: "th" },
      { type: "box", name: "Box", icon: "square-o" },
    ];

    if (visualizationsSettings.allowCustomJSVisualizations) {
      result.push({ type: "custom", name: "Custom", icon: "code" });
    }

    if (hiddenChartTypes.length > 0) {
      return filter(result, ({ type }) => !includes(hiddenChartTypes, type));
    }

    return result;
  }, []);

  return (
    <Select {...props}>
      {map(chartTypes, ({ type, name, icon }) => (
        <Select.Option key={type} value={type} data-test={`Chart.ChartType.${type}`}>
          <i className={`fa fa-${icon}`} style={{ marginRight: 5 }} />
          {name}
        </Select.Option>
      ))}
    </Select>
  );
}

ChartTypeSelect.defaultProps = {
  hiddenChartTypes: [],
};

ChartTypeSelect.propTypes = {
  hiddenChartTypes: PropTypes.arrayOf(
    PropTypes.oneOf(["line", "area", "column", "pie", "scatter", "heatmap", "bubble", "box"])
  ),
};
