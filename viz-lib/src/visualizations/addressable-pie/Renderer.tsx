import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import useSize from "@react-hook/size";
// import tw from "tailwind-styled-components";
// import Skeleton from "react-loading-skeleton";
import { interpolatePath } from "d3-interpolate-path";

// import { ReactComponent as ChartSkeleton } from "~/shared/assets/skeletons/pie-chart.svg";
import { formatNumber } from "@/services/formatNumber";

import getData from "./getData";

// import Typography from "../../Typography";

import "./Renderer.less";

interface Datum {
  x: string;
  y: number;
}

const CIRCLE_THICKNESS = 20;
const CIRCLE_EXPAND = 5;
const SEGMENTS_GROW = 0.13;
const CORNER_RADIUS = 40;

const MIN_CHART_RADIUS = 85;
const MAX_CHART_RADIUS = 125;
const CHART_PADDING = 28;

const BIG_SCREEN_BREAKPOINT = 300;

const MIN_ARC = 4.5;

const colors = ["#B045E6", "#EC407A", "#FFD600", "#00BCD4", "#0091EA"];

// const SkeletonContainer = tw.div`
// flex items-center justify-center h-full
// `;

// const SkeletonWrapper = tw.div`
// w-full flex justify-center
// `;

// const SkeletonLegend = tw.div`
// self-end ml-auto flex-[24] flex-y gap-1
// `;

// const SkeletonLegendItem = tw.div`
// flex gap-3
// `;

// const Container = tw.div`
// w-full h-full flex
// `;

// const LegendContainer = tw.div<{
//   $isBigScreen: boolean;
// }>`
// flex shrink-0 flex-col gap-2 h-full
// ${p => (p.$isBigScreen ? "justify-end" : "justify-center")}
// `;

// const LegendItem = tw.div`
// flex gap-1 items-center
// `;

interface SelectedColumn {
  data: Datum[];
}

export default function Renderer(input: any) {
  const rawData = getData(input.data.rows, input.options) as any;

  const columns = Object.keys(rawData);

  const selectedColumn = rawData[columns[0]] as SelectedColumn;

  const data = selectedColumn ? selectedColumn.data : [];

  //const sum = slicedData.reduce((sum: any, d: any) => sum + d.y, 0);

  //   if (error || !data?.length || loading || sum <= 0) {
  //     return (
  //       <SkeletonContainer>
  //         <SkeletonWrapper>
  //           <ChartSkeleton />
  //         </SkeletonWrapper>

  //         <SkeletonLegend>
  //           {[...Array(8)].map((_, i) => (
  //             <SkeletonLegendItem key={i}>
  //               <Skeleton circle width={12} height={12} />
  //               <Skeleton containerClassName="flex items-center" width={40} height={4} />
  //               <Skeleton containerClassName="flex items-center" width={40} height={4} />
  //             </SkeletonLegendItem>
  //           ))}
  //         </SkeletonLegend>
  //       </SkeletonContainer>
  //     );
  //   }

  return <SafePieChart data={data} />;
}

function SafePieChart({ data }: { data: Datum[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, height] = useSize(containerRef);
  const isBigScreen = width >= BIG_SCREEN_BREAKPOINT;

  useEffect(() => {
    const svg = d3.select(ref.current);

    const maxRadiusX = width / 2 - CHART_PADDING;
    const maxRadiusY = height / 2 - CHART_PADDING;
    const chartRadius = Math.max(Math.min(maxRadiusX, maxRadiusY, MAX_CHART_RADIUS), MIN_CHART_RADIUS);

    const chartLeftPadding = isBigScreen ? width / 2 : chartRadius + CHART_PADDING / 2;

    const g = svg.append("g").attr("transform", `translate(${chartLeftPadding},${height / 2})`);

    const colorDomain = data.map(({ x }) => x);

    // @ts-ignore
    const colorScale = d3.scale
      .ordinal()
      .domain(colorDomain)
      .range(colors);

    // @ts-ignore
    const pie = d3.layout
      .pie<Datum>()
      // @ts-ignore
      .value(function(d) {
        return d.y;
      })
      .sort(null);

    createPieChart(data, g, pie, colorScale, chartRadius);
    createPieChartTooltip(g);

    return () => {
      svg.selectAll("*").remove();
    };
  }, [width, height]);

  return (
    <div className="chart-container">
      <div
        style={{
          // @ts-ignore
          flexGrow: "1",
        }}
        ref={containerRef}>
        <svg ref={ref} width="100%" height="100%"></svg>
      </div>
      <div className="legend-container">
        {data.map((d, i) => (
          <div className="legend-item" key={i}>
            <div style={{ backgroundColor: colors[i], height: "12px", width: "12px", borderRadius: "9999px" }} />

            <div className="legend-title">{d.x}</div>

            <div className="legend-value">{getPercent(data, d.y)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getPercent(data: Datum[], y: number) {
  const sum = data.reduce<number>((s, d) => s + d.y, 0);
  const percent = (y / sum) * 100;

  if (percent < 1) {
    return parseFloat(percent.toFixed(1));
  }
  return Math.round(percent);
}

function createPieChart(
  data: Datum[],
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  pie: d3.Pie<unknown, Datum>,
  colorScale: d3.ScaleOrdinal<string, string, never>,
  chartRadius: number
) {
  const path = d3.svg
    // @ts-ignore
    .arc<d3.PieArcDatum<Datum>>()
    .outerRadius(chartRadius)
    .innerRadius(chartRadius - CIRCLE_THICKNESS)
    // @ts-ignore
    .startAngle(function(d) {
      return d.startAngle - SEGMENTS_GROW;
    })
    .cornerRadius(CORNER_RADIUS);

  const pathHover = d3.svg
    // @ts-ignore
    .arc<d3.PieArcDatum<Datum>>()
    .innerRadius(chartRadius + CIRCLE_EXPAND)
    .outerRadius(chartRadius - CIRCLE_THICKNESS - CIRCLE_EXPAND)
    // @ts-ignore
    .startAngle(function(d) {
      return d.startAngle - SEGMENTS_GROW;
    })
    .cornerRadius(CORNER_RADIUS);
  const pieData = createPieData(data);

  const arc = g
    .selectAll(".arc")
    .data(pie(pieData))
    .enter()
    .append("g")
    .attr("class", "arc");

  arc
    .append("path")
    .attr("d", path)
    .attr("stroke-width", "4px")
    .attr("stroke", "white")
    .attr("fill", function(d) {
      return colorScale(d.data.x);
    })
    .on("mouseover", function(d) {
      d3.select(this)
        .transition()
        .duration(300)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .attrTween("d", (d: d3.PieArcDatum<Datum>) => {
          const previous = d3.select(this).attr("d");
          const current = pathHover(d);

          return current ? interpolatePath(previous, current) : null;
        });

      const x = d.data.x;
      const dataItem = data.find(d => d.x === x);

      if (dataItem) {
        g.select(".pie-value")
          .text(formatNumber(dataItem.y))
          .transition()
          .duration(300)
          .style("opacity", 1);
        g.select(".pie-title")
          .text(d.data.x)
          .transition()
          .duration(300)
          .style("opacity", 1);
      }
    })
    .on("mouseout", function() {
      d3.select(this)
        .transition()
        .duration(300)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .attrTween("d", (d: d3.PieArcDatum<Datum>) => {
          const previous = d3.select(this).attr("d");
          const current = path(d);

          return current ? interpolatePath(previous, current) : null;
        });
      g.select(".pie-value")
        .transition()
        .duration(300)
        .style("opacity", 0);
      g.select(".pie-title")
        .transition()
        .duration(300)
        .style("opacity", 0);
    });

  // g.select(".arc:first-child").raise();
}

function createPieChartTooltip(g: d3.Selection<SVGGElement, unknown, null, undefined>) {
  g.append("text")
    .attr("class", "pie-value")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("letter-spacing", "-2px")
    .style("opacity", 0)
    .style("font-family", "Inter")
    .style("font-weight", 500)
    .style("fill", "#6A7290")
    .style("font-size", "48px");

  g.append("text")
    .attr("class", "pie-title")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(0, 40)`)
    .style("opacity", 0)
    .style("font-family", "Inter")
    .style("fill", "#353B4F")
    .style("font-size", "14px");
}

function createPieData(data: Datum[]) {
  // enlarge small elements to a threshold, calculate pie chart arc lengths (in percent)
  const itemsBelowThreshold = data.filter(d => {
    const y = d.y;
    const curPercent = getPercent(data, y);

    return curPercent <= MIN_ARC;
  });
  const itemsAboveThreshold = data.filter(d => {
    const y = d.y;
    const curPercent = getPercent(data, y);

    return curPercent > MIN_ARC;
  });

  const aboveThresholdFraction = 100 - itemsBelowThreshold.length * MIN_ARC;
  const aboveThresholdSum = itemsAboveThreshold.reduce((s, d) => s + d.y, 0);

  const pieData = data
    .filter(d => d.y > 0)
    .map(d => {
      const y = d.y;

      const curPercent = getPercent(data, y);

      const newPercent = curPercent <= MIN_ARC ? MIN_ARC : (d.y / aboveThresholdSum) * aboveThresholdFraction;

      return {
        x: d.x,
        y: newPercent,
      };
    });

  return pieData;
}
