import React from "react";

import "./Renderer.less";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import useSize from "@react-hook/size";
// import Skeleton from "react-loading-skeleton";

import { formatNumber } from "@/services/formatNumber";
// import TwitterAccountProfile from "~/shared/components/TwitterAccountProfile";

// import Modal from "../../Modal";

interface TooltipData {
  top: number;
  left: number;
  value: number;
  color: string;
}

const colors = ["#B045E6", "#C87DEE", "#EC407A", "#F06695", "#FFD600", "#0091EA", "#80C8F4", "#00BFA5", "#80DFD2"];
const hoveredColors = [
  "#8319b8",
  "#9f1de1",
  "#bf134d",
  "#da1558",
  "#b39600",
  "#0065a4",
  "#199ceb",
  "#008673",
  "#31c4b0",
];

const CHART_TOP_MARGIN = 48;
const CHART_LEFT_MARGIN = 48;
const AXIS_MARGIN = 96;

const BAR_WIDTH = 48;
const BAR_RADIUS = 8;
const BAR_MARGIN = 24;

const PER_PAGE = 8;

const TICKS_COUNT = 5;
const TICKS_MULTIPLIER = 1.1;
const TICKS_THRESHOLD = 100;

// const SkeletonContainer = tw.div`
// flex justify-center h-full
// `;

// const SkeletonAxis = tw.div`
// flex-y justify-around pb-5
// `;

// const SkeletonChart = tw.div`
// flex justify-around w-full self-end
// `;

// const SkeletonBar = tw.div`
// flex-y gap-3 mt-auto
// `;

export default function Renderer({ options, data }: any) {
  const page = 0;

  const { rows } = data;

  const dataPage = rows.slice(PER_PAGE * page, PER_PAGE * (page + 1));

  return <SafeVerticalBarChart data={dataPage} maxY={Math.max(...rows.map((d: any) => d.discountPercentage))} />;
}

function SafeVerticalBarChart({ data, maxY }: any) {
  const ref = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [widthPadded, height] = useSize(containerRef);
  const width = widthPadded - 30; // div.container padding
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [twitterModal, setTwitterModal] = useState(null);

  const lastTickY = Math.round(maxY <= TICKS_THRESHOLD ? maxY * TICKS_MULTIPLIER : 100);
  const tickValues = [...Array(TICKS_COUNT)].map((_, i) => (i * lastTickY) / (TICKS_COUNT - 1));

  const [barHeights, setBarHeights] = useState(Array(PER_PAGE).fill(0));

  useEffect(() => {
    return updateChart("resize");
  }, [width, height]);

  useEffect(() => {
    return updateChart("dataUpdate");
  }, [data]);

  function updateChart(action: string) {
    if (width <= 0 && height <= 0) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    svg.attr("data-gtm-area", "vertical-bar-chart");

    const g = svg.append("g").attr("transform", `translate(${CHART_LEFT_MARGIN},${CHART_TOP_MARGIN})`);
    const contentHeight = height - AXIS_MARGIN;

    const { xScale, yScale } = createScales(data, width, contentHeight, lastTickY);

    createVerticalBarChartAxis(data, g, xScale, yScale, contentHeight, tickValues, showTwitterModal);
    createVerticalBarChart(data, g, xScale, yScale, contentHeight, barHeights, setBarHeights, setTooltipData, action);
    return () => {
      svg.selectAll("*").remove();
    };
  }

  function showTwitterModal({
    name,
    metadata: {
      description,
      followers_count,
      following_count,
      location,
      profile_creation_date,
      profile_image_url,
      username,
      urls = [],
    },
  }: any) {
    // setTwitterModal({
    //   description,
    //   followers_count,
    //   following_count,
    //   location,
    //   name,
    //   profile_creation_date,
    //   profile_image_url,
    //   urls,
    //   username,
    // });
  }

  return (
    <div className="vertical-bar-chart-container" ref={containerRef}>
      {tooltipData && <ChartTooltip tooltipData={tooltipData} />}
      <svg ref={ref} width="100%" height="100%" style={{ minHeight: "280px" }}></svg>
      {/* <Modal
        size="medium"
        onClose={() => setTwitterModal(null)}
        showModal={!!twitterModal}
        withPadding={false}
        closeIconVariant="icon-button"
        closeIconHasEqualMargin>
        {twitterModal && <TwitterAccountProfile data={twitterModal} />}
      </Modal> */}
    </div>
  );
}

function ChartTooltip({ tooltipData }: { tooltipData: TooltipData }) {
  return (
    <div className="tooltip-container" style={{ top: tooltipData.top, left: tooltipData.left }}>
      <div className="tooltip-dot" style={{ backgroundColor: tooltipData.color }} />
      {tooltipData && tooltipData.value}%
    </div>
  );
}

function createScales(data: any, width: number, height: number, lastTickY: number) {
  const xScale = d3.scaleBand().range([0, width - CHART_LEFT_MARGIN]);
  const yScale = d3.scaleLinear().range([height, 0]);

  xScale.domain(
    data.map(function(d: any) {
      return d.title.trim();
    })
  );
  yScale.domain([0, lastTickY]).nice();

  return { xScale, yScale };
}

function createVerticalBarChartAxis(
  data: any,
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleBand<string>,
  yScale: d3.ScaleLinear<number, number, never>,
  height: number,
  tickValues: number[],
  showTwitterModal: (_: any) => void
) {
  g.append("g")
    .attr("class", "x-ticks")
    .attr("transform", `translate(0,${height + BAR_MARGIN})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .attr("font-family", "Inter")
    .attr("font-size", "14px")
    .call(g => g.select(".domain").remove());

  g.append("g")
    .attr("class", "y-ticks")
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat(d => `${formatNumber(d.valueOf())}%`)
        .tickSize(0)
        .tickValues(tickValues)
    )
    .attr("font-family", "Inter")
    .attr("font-size", "14px")
    .call(g => g.select(".domain").remove());

  g.selectAll(".tick")
    .data(data)
    .style("cursor", "pointer")
    .on("click", (e, data) => {
      // showTwitterModal(data);
    });

  g.selectAll(".y-ticks .tick text").attr("class", "text-gray-400");

  const maxTickWidth = xScale.bandwidth();
  const ticks = g
    .selectAll(".x-ticks .tick text")
    .attr("class", "text-primary-500 underline")
    .attr("data-gtm-action", "username-link");
  ellipsis(ticks, maxTickWidth);
}

function renderBar(name: string, barHeight: number, chartHeight: number, xScale: d3.ScaleBand<string>) {
  const x = xScale(name) as number;
  const left = x + xScale.bandwidth() / 2 - BAR_WIDTH / 2;

  return `
      M${left},${chartHeight}
      v-${barHeight}
      a${BAR_RADIUS},${BAR_RADIUS} 0 0 1 ${BAR_RADIUS},-${BAR_RADIUS}
      h${BAR_WIDTH - 2 * BAR_RADIUS}
      a${BAR_RADIUS},${BAR_RADIUS} 0 0 1 ${BAR_RADIUS},${BAR_RADIUS}
      v${barHeight}
      z
      `;
}

function createVerticalBarChart(
  data: any,
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleBand<string>,
  yScale: d3.ScaleLinear<number, number, never>,
  height: number,
  barHeights: number[],
  setBarHeights: (_: number[]) => void,
  setTooltipData: (_: TooltipData | null) => void,
  action: string
) {
  const barGroups = g
    .selectAll(".bar-group")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "bar-group");
  barGroups
    .append("path")
    .attr("i", function(_, i) {
      return i;
    })
    .attr("d", function(d: any, i) {
      const prevBarHeight = barHeights[i] || 0;
      const intlBarHeight = action === "dataUpdate" ? prevBarHeight : height - yScale(d.discountPercentage);

      return renderBar(d.title.trim(), intlBarHeight, height, xScale);
    })
    .attr("fill", function(d, i) {
      return colors[i % colors.length];
    })
    .attr("stroke", function(d, i) {
      return hoveredColors[i % colors.length];
    })
    .attr("stroke-width", "0px")
    .on("mouseenter", (e, d: any) => {
      const target = d3.select(e.target);
      const i = parseInt(target.attr("i"), 10);

      d3.select(e.target).attr("stroke-width", "2px");

      const x = xScale(d.title.trim()) as number;
      const left = x + xScale.bandwidth() / 2;

      setTooltipData({
        color: colors[i % colors.length],
        value: d.discountPercentage,
        left: left + CHART_LEFT_MARGIN + 15, // 15 is container margin
        top: yScale(d.discountPercentage),
      });
    })
    .on("mouseleave", () => {
      d3.selectAll(".bar-group path").attr("stroke-width", "0px");
      setTooltipData(null);
    });

  if (action === "dataUpdate") {
    barGroups
      .select("path")
      .transition()
      .duration(600)
      .attr("d", function(d: any) {
        const finalBarHeight = height - yScale(d.discountPercentage);

        return renderBar(d.title.trim(), finalBarHeight, height, xScale);
      });
  }

  const heights = data.map((d: any) => height - yScale(d.discountPercentage));
  setBarHeights(heights);
}

function ellipsis(text: d3.Selection<d3.BaseType, unknown, SVGGElement, unknown>, maxWidth: number) {
  text.each(function() {
    const text = d3.select(this);
    const characters = text
      .text()
      .trim()
      .split("");

    const ellipsis = text
      .text("")
      .append("tspan")
      .attr("class", "elip")
      .text("...");
    const ellipsisNode = ellipsis.node();

    if (!ellipsisNode) {
      return;
    }

    const width = maxWidth - ellipsisNode.getComputedTextLength();
    const numChars = characters.length;

    const tspan = text.insert("tspan", ":first-child").text(characters.join(""));
    const tspanNode = tspan.node();

    if (!tspanNode) {
      return;
    }

    while (tspanNode.getComputedTextLength() > width && characters.length) {
      characters.pop();
      tspan.text(characters.join(""));
    }

    if (characters.length === numChars) {
      ellipsis.remove();
    }
  });
}
