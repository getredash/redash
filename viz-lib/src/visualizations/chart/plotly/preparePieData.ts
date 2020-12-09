import { isString, each, extend, includes, map, reduce } from "lodash";
import d3 from "d3";
import chooseTextColorForBackground from "@/lib/chooseTextColorForBackground";
import { ColorPaletteArray } from "@/visualizations/ColorPalette";

import { cleanNumber, normalizeValue } from "./utils";

export function getPieDimensions(series: any) {
  const rows = series.length > 2 ? 2 : 1;
  const cellsInRow = Math.ceil(series.length / rows);
  const cellWidth = 1 / cellsInRow;
  const cellHeight = 1 / rows;
  const xPadding = 0.02;
  const yPadding = 0.1;

  return { rows, cellsInRow, cellWidth, cellHeight, xPadding, yPadding };
}

function getPieHoverInfoPattern(options: any) {
  const hasX = /{{\s*@@x\s*}}/.test(options.textFormat);
  let result = "text";
  if (!hasX) result += "+label";
  return result;
}

function prepareSeries(series: any, options: any, additionalOptions: any) {
  const {
    cellWidth,
    cellHeight,
    xPadding,
    yPadding,
    cellsInRow,
    hasX,
    index,
    hoverInfoPattern,
    getValueColor,
  } = additionalOptions;

  const seriesOptions = extend({ type: options.globalSeriesType, yAxis: 0 }, options.seriesOptions[series.name]);

  const xPosition = (index % cellsInRow) * cellWidth;
  const yPosition = Math.floor(index / cellsInRow) * cellHeight;

  const labels: any = [];
  const values: any = [];
  const sourceData = new Map();
  const seriesTotal = reduce(
    series.data,
    (result, row) => {
      const y = cleanNumber(row.y);
      return result + Math.abs(y);
    },
    0
  );
  each(series.data, row => {
    const x = hasX ? normalizeValue(row.x, options.xAxis.type) : `Slice ${index}`;
    const y = cleanNumber(row.y);
    labels.push(x);
    values.push(y);
    sourceData.set(x, {
      x,
      y,
      yPercent: (y / seriesTotal) * 100,
      row,
    });
  });

  const markerColors = map(series.data, row => getValueColor(row.x));
  const textColors = map(markerColors, c => chooseTextColorForBackground(c));

  return {
    visible: true,
    values,
    labels,
    type: "pie",
    hole: 0.4,
    marker: {
      colors: markerColors,
    },
    hoverinfo: hoverInfoPattern,
    text: [],
    textinfo: options.showDataLabels ? "percent" : "none",
    textposition: "inside",
    textfont: {
      color: textColors,
    },
    name: seriesOptions.name || series.name,
    direction: options.direction.type,
    domain: {
      x: [xPosition, xPosition + cellWidth - xPadding],
      y: [yPosition, yPosition + cellHeight - yPadding],
    },
    sourceData,
  };
}

export default function preparePieData(seriesList: any, options: any) {
  // we will use this to assign colors for values that have no explicitly set color
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'scale' does not exist on type 'typeof im... Remove this comment to see the full error message
  const getDefaultColor = d3.scale
    .ordinal()
    .domain([])
    .range(ColorPaletteArray);
  const valuesColors = {};
  each(options.valuesOptions, (item, key) => {
    if (isString(item.color) && item.color !== "") {
      // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      valuesColors[key] = item.color;
    }
  });

  const additionalOptions = {
    ...getPieDimensions(seriesList),
    hasX: includes(options.columnMapping, "x"),
    hoverInfoPattern: getPieHoverInfoPattern(options),
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    getValueColor: (v: any) => valuesColors[v] || getDefaultColor(v),
  };

  return map(seriesList, (series, index) => prepareSeries(series, options, { ...additionalOptions, index }));
}
