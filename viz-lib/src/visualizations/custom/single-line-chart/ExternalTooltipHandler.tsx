import * as d3 from "d3";
import { formatNumber } from "@/services/formatNumber";

/* eslint-disable @typescript-eslint/no-explicit-any */
const getOrCreateTooltip = (chart: {
  canvas: { parentNode: { querySelector: (arg0: string) => any; appendChild: (arg0: any) => void } };
}) => {
  let tooltipEl = chart.canvas.parentNode.querySelector("div");

  if (!tooltipEl) {
    const tableCon = document.createElement("div");

    tooltipEl = document.createElement("div");
    tooltipEl.style.background = "rgba(0, 0, 0, 0.7)";
    tableCon.style.borderRadius = "3px";
    tooltipEl.style.opacity = "1";
    tooltipEl.style.pointerEvents = "none";
    tooltipEl.style.position = "absolute";
    tooltipEl.style.transform = "translate(-50%, 0)";

    const pointerWrapper = document.createElement("div");
    pointerWrapper.style.display = "flex";
    pointerWrapper.style.width = "100%";
    pointerWrapper.style.justifyContent = "center";

    const pointerImage = document.createElement("img");
    pointerImage.src = "/static/images/pointer.png";
    pointerImage.width = 65;
    pointerImage.height = 65;
    pointerImage.style.minWidth = "65px";
    pointerImage.style.minHeight = "65px";

    const table = document.createElement("table");
    tableCon.style.display = "flex";
    tableCon.style.flexDirection = "column";
    table.style.width = "100%";

    pointerWrapper.appendChild(pointerImage);
    tableCon.appendChild(table);
    tooltipEl.appendChild(tableCon);
    tooltipEl.appendChild(pointerWrapper);
    chart.canvas.parentNode.appendChild(tooltipEl);
  }

  return tooltipEl;
};

export const ExternalTooltipHandler = (context: { chart: any; tooltip: any }) => {
  // Tooltip Element
  const { chart, tooltip } = context;
  const tooltipEl = getOrCreateTooltip(chart);

  // Hide if no tooltip
  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = 0;
    return;
  }
  const tableCon = tooltipEl.querySelector("div");
  const tableRoot = tableCon.querySelector("table");
  let dataPointY;
  let tableConMarginBottom;

  if (tooltip.dataPoints[0].element.y < 100) {
    dataPointY = tooltip.dataPoints[0].element.y + 40;
    tableConMarginBottom = "6px";
  } else {
    dataPointY = tooltip.dataPoints[0].element.y;
    tableConMarginBottom = "46px";
  }
  tableCon.style.marginTop = `${dataPointY - 100}px`;
  tableCon.style.marginBottom = tableConMarginBottom;

  tableCon.style.display = "flex";
  tableCon.style.alignItems = "center";

  // Set Text
  if (tooltip.body) {
    const titleLines = tooltip.body.map((b: { lines: any }) => b.lines) || [];
    // const bodyLines = tooltip.body.map((b: { lines: any }) => b.lines);

    const tableHead = document.createElement("thead");

    titleLines.forEach((title: string) => {
      const span = document.createElement("span");
      span.style.background = "#AA00FF";
      span.style.borderColor = "#AA00FF";
      span.style.borderWidth = "2px";
      span.style.borderRadius = "100%";
      span.style.height = "5.92px";
      span.style.width = "5.92px";
      span.style.display = "inline-block";
      span.style.flex = "1 0 auto";

      const tr = document.createElement("tr");
      tr.style.borderWidth = "0px";

      const flex = document.createElement("div");
      flex.style.display = "flex";
      flex.style.gap = "4px";
      flex.style.alignItems = "center";
      flex.style.justifyContent = "center";
      flex.style.paddingInline = "6px";
      flex.style.fontSize = "12px";
      flex.style.fontFamily = "Inter";
      flex.style.fontWeight = "500";
      flex.style.color = "#474E6A";
      flex.style.width = "100%";

      const dateSpan = document.createElement("span");

      const date = d3.timeParse("%m/%d")(tooltip.title[0]);

      if (!date) return;

      const formatTime = d3.timeFormat("%b %d")(date);

      dateSpan.innerText = formatTime;
      dateSpan.style.fontFamily = "Inter";
      dateSpan.style.color = "#6A7290";
      dateSpan.style.fontWeight = "400";
      dateSpan.style.flex = "1 0 auto";
      dateSpan.style.fontSize = "12px";
      dateSpan.style.marginRight = "4px";

      const text = document.createElement("span");
      text.style.fontSize = "12px";
      text.innerText = formatNumber(Number(title[0].replaceAll(",", "")));

      flex.appendChild(dateSpan);
      flex.appendChild(span);
      flex.appendChild(text);

      const th = document.createElement("th");
      th.style.borderWidth = "0px";

      th.appendChild(flex);
      tr.appendChild(th);
      tableHead.appendChild(th);
    });

    // Remove old children
    while (tableRoot.firstChild) {
      tableRoot.firstChild.remove();
    }

    // Add new children
    tableRoot.appendChild(tableHead);
  }

  const { offsetLeft: positionX } = chart.canvas;

  // Display, position, and set styles for font
  tooltipEl.style.opacity = 1;
  tooltipEl.style.backgroundColor = "transparent";
  tooltipEl.style.maxHeight = "320px";
  tableCon.style.backgroundColor = "#FBFBFF";
  tooltipEl.style.left = `${positionX + tooltip.caretX}px`;
  tooltipEl.style.top = "-12px";
  tooltipEl.style.font = tooltip.options.bodyFont.string;
  tableCon.style.paddingLeft = "6px";
  tableCon.style.paddingRight = "6px";
  tableCon.style.paddingTop = "2px";
  tableCon.style.paddingBottom = "2px";
  tableCon.style.borderRadius = "14.5px";
  tableCon.style.height = "18.85px";
  tableCon.style.backdropFilter = "blur(7.5px)";
  tableCon.style.boxShadow = "0px 17px 35px rgba(255, 57, 223, 0.15)";
  tableCon.style.width = "max-content";
  tableCon.style.marginLeft = "auto";
  tableCon.style.marginRight = "auto";
  tableCon.style.paddingTop = "7.2px";
  tableCon.style.paddingBottom = "7.2px";
  tableCon.style.borderRadius = "12px";
  tableCon.style.height = "34.7px";
};
