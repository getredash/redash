import React, { useEffect, useRef, useState, MouseEvent } from "react";
import * as d3 from "d3";
import useSize from "@react-hook/size";
import Select from "react-select";

import getData from "./getData";
import { Moment } from "moment";

import "./Renderer.less";

import Cross from "./Cross";

interface Datum {
  x: Moment;
  y: number;
}

type TooltipData = {
  date: string;
  values: {
    x: Moment;
    y: number;
    color: string;
  }[];
};

const colors = ["#00BFA5", "#EC407A", "#00BCD4", "#F68D7D"];

const PRIMARY_COLOR = "#B045E6";

const PRIMARY_LINE_WIDTH = 8;
const DEFAULT_LINE_WIDTH = 4;

const CHART_LEFT_MARGIN = 48;
const CHART_BOTTOM_MARGIN = 24;

const AXIS_X_BOTTOM_MARGIN = 48;
const AXIS_Y_LEFT_MARGIN = 24;

const PRIMARY_CONTRACT_PIN_SIZE = 36;
const DEFAULT_CONTRACT_PIN_SIZE = 20;

const MAX_SELECTED_OPTIONS = 4;

const formatNumber = (x: number) => (x !== 0 ? `${Math.floor(x / 1000)}K` : "0");

export default function Renderer(input: any) {
  const data = getData(input.data.rows, input.options);

  const columns = Object.keys(data);

  return <SeriesLineChart data={data} columns={columns} />;
}

function SeriesLineChart({ data, columns }: any) {
  const ref = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, height] = useSize(containerRef);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData>({
    date: "n/a",
    values: [{ contract: "n/a", y: 0, color: "#FF0000" } as any],
  });

  const [selectedOptions, setSelectedOptions] = useState([{ value: "primary", label: "primary" }]);

  const options = columns.map((column: any) => ({
    value: column,
    label: column,
  }));

  // const [selected, setSelected] = useState<SelectOption[]>([]);
  // const contractLoadOptions = useDebouncedLoadOptions("contracts");

  const handleSelectChange = (selectedOptions: any) => {
    setSelectedOptions(selectedOptions);
  };

  useEffect(() => {
    const svg = d3.select(ref.current);
    const g = svg.append("g").attr("transform", `translate(0,${CHART_BOTTOM_MARGIN})`);
    const sampleData = data["primary"].data;
    const { xScale, yScale } = createScales(width, height, sampleData);
    const selectedColumns = selectedOptions.map(i => i.value);

    createSeriesLineChartAxis(g, xScale, yScale, height);
    const chartArea = createSeriesLineChart(g, xScale, yScale, width, data, selectedColumns);
    createSeriesLineChartGradients(g, width, height);
    createSeriesLineChartCursor(
      tooltipRef,
      setTooltipData,
      chartArea,
      xScale,
      yScale,
      height,
      sampleData,
      data,
      columns
    );

    return () => {
      svg.selectAll("*").remove();
    };
  }, [width, height, selectedOptions]);

  // const handleSelectChange = (values: MultiValue<SelectOption>) => {
  //   if (values.length <= MAX_SELECTED_OPTIONS) {
  //     setSelected(values as SelectOption[]);
  //   }
  // };

  const handleRemoveValue = (e: MouseEvent<HTMLButtonElement>) => {
    const { name: buttonName } = e.currentTarget;
    const removedValue = selectedOptions.find(val => val.label === buttonName);

    if (!removedValue) return;
    handleSelectChange(selectedOptions.filter(val => val.label !== buttonName));
  };

  return (
    <div className="multiline-chart-container">
      <div className="chart-controls">
        <div className="chart-title">Your audience</div>

        <div className="chart-typography" style={{ marginLeft: "12px" }}>
          Compare with:
        </div>

        <Select
          isMulti
          placeholder="Insert contract name"
          options={options}
          value={selectedOptions}
          defaultValue={selectedOptions[0]}
          className="basic-multi-select"
          controlShouldRenderValue={false}
          onChange={handleSelectChange}
        />

        {/* <ContractsSelect
          mustTypeFirst
          onChange={handleSelectChange}
          value={selected}
          loadOptions={contractLoadOptions}
          className={`contracts-multi-line-chart ${loading || error ? "pointer-events-none" : ""}`}
          placeholder="Insert contract name"
          customizedOptions={ContractsAutocomplete}
          optionStyles={{ backgroundColor: "white !important" }}
        /> */}

        <div className="bullets-container">
          {selectedOptions.map(
            (val, i) =>
              val.value !== "primary" && (
                <div className="bullet-item" key={i} style={{ backgroundColor: `${colors[i]}20`, color: colors[i] }}>
                  {val.label}
                  <button name={val.label} className="bullet-button" onClick={handleRemoveValue}>
                    <Cross fill={colors[i]} />
                  </button>
                </div>
              )
          )}
        </div>
      </div>
      <div className="chart-wrapper">
        <div className="tooltip-container" ref={tooltipRef}>
          <div className="chart-typography">{tooltipData.date}</div>
          {tooltipData.values.map((item, i) => (
            <div key={i} className="tooltip-item-wrapper">
              <div
                className="tooltip-item"
                // $isPrimary={item.contract === "primary"}
                style={{ backgroundColor: item.color }}
              />
              <div className="chart-tooltip-value">{item.y}</div>
            </div>
          ))}
        </div>
        <div ref={containerRef} style={{ height: "100%", paddingTop: "2rem" }}>
          <svg ref={ref} width="100%" height="100%"></svg>
        </div>
      </div>
    </div>
  );
}

function createScales(width: number, height: number, sampleData: any) {
  const xExtent = d3.extent(sampleData, (d: any) => d.x) as any;
  const xScale = d3
    .scaleTime()
    .domain(xExtent)
    .range([0, width - AXIS_Y_LEFT_MARGIN]);

  const yExtent = d3.extent(sampleData, (d: any) => d.y) as any;
  const yScale = d3
    .scaleLinear()
    .domain([0, yExtent[1]])
    .range([height - AXIS_X_BOTTOM_MARGIN, 0])
    .nice();

  return { xScale, yScale };
}

function createLineGradient(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  color: string,
  id: string,
  width: number
) {
  g.append("linearGradient")
    .attr("id", id)
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", width)
    .attr("y2", 0)
    .selectAll("stop")
    .data([
      { offset: "0%", color: "#FFFFFF00" },
      { offset: "10%", color: `${color}80` },
      { offset: "50%", color: color },
      { offset: "90%", color: `${color}80` },
      { offset: "100%", color: "#FFFFFF00" },
    ])
    .enter()
    .append("stop")
    .attr("offset", function(d) {
      return d.offset;
    })
    .attr("stop-color", function(d) {
      return d.color;
    });

  return id;
}

function createSeriesLineChartGradients(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  width: number,
  height: number
) {
  createLineGradient(g, PRIMARY_COLOR, "line-primary", width);

  g.append("linearGradient")
    .attr("id", "pin-gradient")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", height - AXIS_X_BOTTOM_MARGIN)
    .selectAll("stop")
    .data([
      { offset: "0%", color: "#AA00FF" },
      { offset: "50%", color: "#B045E680" },
      { offset: "100%", color: "#C87DEE00" },
    ])
    .enter()
    .append("stop")
    .attr("offset", function(d) {
      return d.offset;
    })
    .attr("stop-color", function(d) {
      return d.color;
    });
}

function createSeriesLineChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleTime<number, number, never>,
  yScale: d3.ScaleLinear<number, number, never>,
  width: number,
  data: any,
  selectedColumns: any
) {
  const chartArea = g.append("g");
  const createChartLine = d3
    .line<Datum>()
    .x(function(d) {
      return xScale(d.x);
    })
    .y(function(d) {
      return yScale(d.y);
    });

  selectedColumns.forEach((columnName: any, i: any) => {
    if (columnName === "primary") {
      chartArea
        .append("path")
        .attr("stroke", "url(#line-primary)")
        .style("stroke-width", PRIMARY_LINE_WIDTH)
        .style("fill", "none")
        // @ts-ignore
        .attr("d", createChartLine(data[columnName].data));
    } else {
      const gradientId = createLineGradient(g, colors[i], `line-${i}`, width);
      chartArea
        .append("path")
        .attr("stroke", `url(#${gradientId})`)
        .style("stroke-width", DEFAULT_LINE_WIDTH)
        .style("fill", "none")
        // @ts-ignore
        .attr("d", createChartLine(data[columnName].data));
    }
  });

  return chartArea;
}

function createSeriesLineChartAxis(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleTime<number, number, never>,
  yScale: d3.ScaleLinear<number, number, never>,
  height: number
) {
  const xAxis = d3
    .axisBottom<Date>(xScale)
    .tickFormat(d3.timeFormat("%d.%m"))
    .ticks(d3.timeDay, 1)
    .tickSize(0);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat(x => formatNumber(x as number))
    .tickSize(0);

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${CHART_LEFT_MARGIN},${height - AXIS_X_BOTTOM_MARGIN})`)
    .call(xAxis)
    .call(g => g.select(".domain").remove());
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${AXIS_Y_LEFT_MARGIN},0)`)
    .call(yAxis)
    .call(g => g.select(".domain").remove());

  g.selectAll(".tick text").attr("class", "text-xs text-gray-300 font-light font-[Inter]");
}

function createSeriesLineChartCursor(
  tooltipRef: React.RefObject<HTMLDivElement>,
  setTooltipData: React.Dispatch<React.SetStateAction<TooltipData>>,
  chartArea: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleTime<number, number, never>,
  yScale: d3.ScaleLinear<number, number, never>,
  height: number,
  sampleData: any,
  data: any,
  columns: any
) {
  const chartWidth = chartArea.node()?.getBBox().width;
  const chartHeight = chartArea.node()?.getBBox().height;

  if (!chartWidth || !chartHeight) {
    return;
  }

  const xAxisLine = chartArea
    .append("g")
    .append("rect")
    .attr("stroke", "url(#pin-gradient)")
    .attr("stroke-width", "1px")
    .attr("fill", "none")
    .style("opacity", 0)
    .attr("width", "1px")
    .attr("height", height);

  const xAccessor = (d: Datum) => d.x;

  const tooltipCircles = columns.map(function(key: any) {
    return chartArea
      .append("image")
      .attr("xlink:href", "/static/images/chart-pin.svg")
      .attr("width", key === "primary" ? PRIMARY_CONTRACT_PIN_SIZE : DEFAULT_CONTRACT_PIN_SIZE)
      .attr("height", key === "primary" ? PRIMARY_CONTRACT_PIN_SIZE : DEFAULT_CONTRACT_PIN_SIZE)
      .attr(
        "transform",
        key === "primary"
          ? `translate(-${PRIMARY_CONTRACT_PIN_SIZE / 2}, -${(PRIMARY_CONTRACT_PIN_SIZE - PRIMARY_LINE_WIDTH) / 2})`
          : `translate(-${DEFAULT_CONTRACT_PIN_SIZE / 2}, -${(DEFAULT_CONTRACT_PIN_SIZE - DEFAULT_LINE_WIDTH) / 2})`
      )
      .style("opacity", 0);
  });

  const tooltip = d3.select(tooltipRef.current).style("opacity", "0");

  chartArea
    .append("rect")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("fill", "transparent")
    .on("mousemove", onMouseMove)
    .on("mouseleave", onMouseLeave);

  function onMouseMove(this: SVGRectElement | null, event: MouseEvent) {
    const mousePosition = d3.pointer(event, this);
    const hoveredDate = xScale.invert(mousePosition[0]);
    const getDistanceFromHoveredDate = (d: Datum) => Math.abs(xAccessor(d).valueOf() - hoveredDate.valueOf());

    const closestIndex = d3.leastIndex(
      sampleData,
      (a: any, b: any) => getDistanceFromHoveredDate(a) - getDistanceFromHoveredDate(b)
    );

    if (!closestIndex) return;

    const closestDataPoint = sampleData[closestIndex];
    const closestXValue = xAccessor(closestDataPoint) as any;

    xAxisLine.attr("x", xScale(closestXValue));

    columns.forEach(function(column: any, i: any) {
      tooltipCircles[i]
        .attr("x", xScale(closestXValue))
        .attr("y", yScale(data[column].data[closestIndex].y))
        .style("opacity", 1);
    });

    const tooltipX = xScale(closestXValue) - parseInt(tooltip.style("width"), 10) / 2;
    const tooltipValues = columns.map((column: any, i: any) => ({
      contract: column,
      y: formatNumber(data[column].data[closestIndex].y),
      color: data[column].data[closestIndex].contract === "primary" ? PRIMARY_COLOR : colors[i],
    }));

    setTooltipData({
      date: d3.timeFormat("%b %d")(closestXValue),
      values: tooltipValues,
    });
    tooltip.style("transform", `translate(${tooltipX}px, 0px)`).style("opacity", "1");
    xAxisLine.style("opacity", 1);
  }

  function onMouseLeave() {
    xAxisLine.style("opacity", 0);
    tooltip.style("opacity", 0);
    tooltipCircles.forEach((d: any) => d.style("opacity", 0));
  }
}
