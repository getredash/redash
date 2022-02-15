import { sort } from "d3";
import _ from "lodash";
import { isNil, isObject, each, forOwn, sortBy, values, groupBy, min, max } from "lodash";

interface Series {
  name: string;
  type: "column";
  data: { $raw: any; x: string | number; y: string | number }[];
}
type SeriesCollection = Partial<Record<string, Series>>;
type AggregationFunction = (yvals: (number | string)[]) => number | string;
export enum AggregationFunctionName {
  FIRST = "FIRST",
  SUM = "SUM",
  MEAN = "MEAN",
  MEDIAN = "MEDIAN",
  MAX = "MAX",
  MIN = "MIN",
  COUNT = "COUNT",
  COUNTDISTINCT = "COUNTDISTINCT",
  P25 = "P25",
  P75 = "P75",
  P05 = "P05",
  P95 = "P95",
}
export const DefaultAggregationFunctionName = AggregationFunctionName.SUM;

const safeSum = (yvals: (number | string)[]): number | string => {
  let result: number | string = 0;
  for (const val of yvals) {
    if (typeof result === "number") {
      if (typeof val === "number") {
        result += val;
      } else if (result === 0) {
        result = val;
      }
    }
  }
  return result;
};
const safeDiv = (val: number | string, denom: number) => {
  if (typeof val === "number") return val / denom;
  return val;
};
const percentile = (vals: (number | string)[], percentile: number): number | string => {
  vals = sortBy([...vals]);
  return vals[Math.floor(vals.length * percentile)];
};
const AGGREGATION_FUNCTIONS: Record<AggregationFunctionName, AggregationFunction> = {
  FIRST: yvals => yvals[0],
  MEAN: yvals => safeDiv(safeSum(yvals), yvals.length),
  COUNT: yvals => yvals.length,
  COUNTDISTINCT: yvals => _.uniq(yvals).length,
  MEDIAN: yvals => percentile(yvals, 0.5),
  SUM: yvals => safeSum(yvals),
  MIN: yvals => min(yvals)!,
  MAX: yvals => max(yvals)!,
  P25: yvals => percentile(yvals, 0.25),
  P75: yvals => percentile(yvals, 0.75),
  P05: yvals => percentile(yvals, 0.05),
  P95: yvals => percentile(yvals, 0.95),
};

function addPointToSeries(point: any, seriesCollection: SeriesCollection, seriesName: string) {
  if (seriesCollection[seriesName] === undefined) {
    seriesCollection[seriesName] = {
      name: seriesName,
      type: "column",
      data: [],
    };
  }

  seriesCollection[seriesName]!.data.push(point);
}

export default function getChartData(data: any, options: any) {
  const _window: any = window;
  _window.getChartData = getChartData;

  _window.data = data;
  _window.options = options;
  const series: SeriesCollection = {};

  const mappings = options.columnMapping;
  each(data, row => {
    let point = { $raw: row };
    let seriesName = null;
    let xValue = 0;
    const yValues = {};
    let eValue: any = null;
    let sizeValue: any = null;
    let zValue: any = null;

    forOwn(row, (value, definition) => {
      definition = "" + definition;
      const definitionParts = definition.split("::") || definition.split("__");
      const name = definitionParts[0];
      const type = mappings ? mappings[definition] : definitionParts[1];

      if (type === "unused") {
        return;
      }

      if (type === "x") {
        xValue = value;
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        point[type] = value;
      }
      if (type === "y") {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        yValues[name] = value;
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        point[type] = value;
      }
      if (type === "yError") {
        eValue = value;
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        point[type] = value;
      }

      if (type === "series") {
        seriesName = String(value);
      }

      if (type === "size") {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        point[type] = value;
        sizeValue = value;
      }

      if (type === "zVal") {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        point[type] = value;
        zValue = value;
      }

      if (type === "multiFilter" || type === "multi-filter") {
        seriesName = String(value);
      }
    });

    if (isNil(seriesName)) {
      each(yValues, (yValue, ySeriesName) => {
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ x: number; y: never; $raw: any; }' is not ... Remove this comment to see the full error message
        point = { x: xValue, y: yValue, $raw: point.$raw };
        if (eValue !== null) {
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'yError' does not exist on type '{ $raw: ... Remove this comment to see the full error message
          point.yError = eValue;
        }

        if (sizeValue !== null) {
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'size' does not exist on type '{ $raw: an... Remove this comment to see the full error message
          point.size = sizeValue;
        }

        if (zValue !== null) {
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'zVal' does not exist on type '{ $raw: an... Remove this comment to see the full error message
          point.zVal = zValue;
        }
        addPointToSeries(point, series, ySeriesName);
      });
    } else {
      addPointToSeries(point, series, seriesName);
    }
  });

  return sortBy(
    values(series).map(series => {
      if (_.includes(["custom", "heatmap", "bubble", "scatter", "box"], options.globalSeriesType)) {
        return series;
      }
      const aggregationFunction: AggregationFunction =
        AGGREGATION_FUNCTIONS[options.yAgg as AggregationFunctionName] ??
        AGGREGATION_FUNCTIONS[DefaultAggregationFunctionName]!;

      const data = values(groupBy(series!.data, point => point.x)).map(points => ({
        ...points[0],
        y: aggregationFunction(points.map(p => p.y)),
      }));
      return { ...series, data };
    }),
    ({ name }) => {
      if (isObject(options.seriesOptions[name])) {
        return options.seriesOptions[name].zIndex || 0;
      }
      return 0;
    }
  );
}
