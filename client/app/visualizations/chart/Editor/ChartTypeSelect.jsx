import { map } from "lodash";
import React, { useMemo } from "react";
import { Select } from "@/components/visualizations/editor";
import { clientConfig } from "@/services/auth";

export default function ChartTypeSelect(props) {
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

    if (clientConfig.allowCustomJSVisualizations) {
      result.push({ type: "custom", name: "Custom", icon: "code" });
    }

    return result;
  }, []);

  return (
    <Select {...props}>
      {map(chartTypes, ({ type, name, icon }) => (
        <Select.Option key={type} value={type} data-test={`Chart.ChartType.${type}`}>
          <i className={`m-r-5 fa fa-${icon}`} />
          {name}
        </Select.Option>
      ))}
    </Select>
  );
}
