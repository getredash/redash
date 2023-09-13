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

    // const pointerImage = document.createElement('img');
    // pointerImage.src = pointer;
    // pointerImage.width = 65;
    // pointerImage.height = 65;
    // pointerImage.style.minWidth = '65px';
    // pointerImage.style.minHeight = '65px';

    const table = document.createElement("table");
    table.style.margin = "0px";
    table.style.background = "transparent";
    tableCon.style.maxWidth = "57.41px";
    tableCon.style.display = "flex";
    tableCon.style.flexDirection = "column";
    table.style.width = "100%";

    tableCon.appendChild(table);
    tooltipEl.appendChild(tableCon);
    // tooltipEl.appendChild(pointerImage);
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

  const dataPointY = tooltip.dataPoints[0].element.y;

  tableCon.style.marginTop = `${dataPointY - 6}px`;

  tableCon.style.display = "flex";
  tableCon.style.alignItems = "center";

  // Set Text
  if (tooltip.body) {
    const titleLines = tooltip.body.map((b: { lines: any }) => b.lines) || [];
    // const bodyLines = tooltip.body.map((b: { lines: any }) => b.lines);

    const tableHead = document.createElement("thead");

    titleLines.forEach((title: string) => {
      const span = document.createElement("span");
      span.style.background = context.tooltip._tooltipItems[0].dataset.tooltipColor();
      span.style.borderColor = context.tooltip._tooltipItems[0].dataset.tooltipColor();

      span.style.borderWidth = "2px";
      span.style.borderRadius = "50%";
      span.style.height = "6px";
      span.style.width = "6px";
      span.style.display = "inline-block";

      const tr = document.createElement("tr");
      tr.style.borderWidth = "0px";

      const flex = document.createElement("div");
      flex.style.display = "flex";
      flex.style.gap = "4px";
      flex.style.alignItems = "center";
      flex.style.justifyContent = "center";
      flex.style.padding = "6px";
      flex.style.fontSize = "14px";
      flex.style.lineHeight = "17px";
      flex.style.fontFamily = "Helvetica Neue";
      flex.style.fontWeight = "500";
      flex.style.color = "#353B4F";

      const text = document.createTextNode(`${formatNumber(Number(title[0].replaceAll(",", "")))}`);

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

  const tooltipWidth = tableCon.getBoundingClientRect().width;
  const tooltipLeftOffset = positionX + tooltip.caretX + 8;

  if (tooltipLeftOffset + tooltipWidth >= chart.width) {
    tooltipEl.style.left = "auto";
    tooltipEl.style.right = `8px`;
  } else {
    tooltipEl.style.left = `${tooltipLeftOffset}px`;
    tooltipEl.style.right = "auto";
  }

  // Display, position, and set styles for font
  tooltipEl.style.opacity = 1;
  tooltipEl.style.backgroundColor = "transparent";
  tooltipEl.style.maxHeight = "320px";
  tableCon.style.backgroundColor = "#FBFBFF";
  tooltipEl.style.top = "-12px";
  tooltipEl.style.font = tooltip.options.bodyFont.string;
  tableCon.style.paddingLeft = "12px";
  tableCon.style.paddingRight = "12px";
  tableCon.style.paddingTop = "2px";
  tableCon.style.paddingBottom = "2px";
  tableCon.style.borderRadius = "14.5px";
  tableCon.style.height = "18.85px";
  tableCon.style.backdropFilter = "blur(7.5px)";
  tableCon.style.boxShadow = "0px 17px 35px rgba(255, 57, 223, 0.15)";
  tableCon.style.justifyContent = "center";
  tableCon.style.width = "fit-content";
  tableCon.style.marginLeft = "auto";
  tableCon.style.marginRight = "auto";
  tableCon.style.paddingTop = "8.85px";
  tableCon.style.paddingBottom = "8.85px";
  tableCon.style.borderRadius = "12px";
  tableCon.style.height = "34.7px";
};
