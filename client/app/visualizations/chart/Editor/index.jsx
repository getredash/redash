/* eslint-disable react/prop-types */
import React from "react";
import createTabbedEditor from "@/components/visualizations/editor/createTabbedEditor";

import GeneralSettings from "./GeneralSettings";
import XAxisSettings from "./XAxisSettings";
import YAxisSettings from "./YAxisSettings";
import SeriesSettings from "./SeriesSettings";
import ColorsSettings from "./ColorsSettings";
import DataLabelsSettings from "./DataLabelsSettings";
import CustomChartSettings from "./CustomChartSettings";

import "./editor.less";

const isCustomChart = options => options.globalSeriesType === "custom";
const isPieChart = options => options.globalSeriesType === "pie";

export default createTabbedEditor([
  {
    key: "General",
    title: "General",
    component: props => (
      <React.Fragment>
        <GeneralSettings {...props} />
        {isCustomChart(props.options) && <CustomChartSettings {...props} />}
      </React.Fragment>
    ),
  },
  {
    key: "XAxis",
    title: "X Axis",
    component: XAxisSettings,
    isAvailable: options => !isCustomChart(options) && !isPieChart(options),
  },
  {
    key: "YAxis",
    title: "Y Axis",
    component: YAxisSettings,
    isAvailable: options => !isCustomChart(options) && !isPieChart(options),
  },
  {
    key: "Series",
    title: "Series",
    component: SeriesSettings,
    isAvailable: options => !isCustomChart(options),
  },
  {
    key: "Colors",
    title: "Colors",
    component: ColorsSettings,
    isAvailable: options => !isCustomChart(options),
  },
  {
    key: "DataLabels",
    title: "Data Labels",
    component: DataLabelsSettings,
    isAvailable: options => !isCustomChart(options),
  },
]);
