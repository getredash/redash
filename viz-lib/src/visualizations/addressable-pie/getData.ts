import { isNil, isObject, each, forOwn, sortBy, values } from "lodash";

function addPointToSeries(point: any, seriesCollection: any, seriesName: any) {
  if (seriesCollection[seriesName] === undefined) {
    seriesCollection[seriesName] = {
      name: seriesName,
      type: "column",
      data: [],
    };
  }

  seriesCollection[seriesName].data.push(point);
}

export default function getData(data: any, options: any) {
  const series = {};

  const mappings = options.columnMapping;

  each(data, row => {
    let point = { $raw: row };
    let seriesName = null;
    let xValue = 0;
    let thumbnailLink = "";
    const yValues = {};

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

      if (type === "series") {
        seriesName = String(value);
      }

      if (type === "thumbnail") {
        thumbnailLink = value;
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        point[type] = value;
      }
    });

    if (isNil(seriesName)) {
      each(yValues, (yValue, ySeriesName) => {
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ x: number; y: never; $raw: any; }' is not ... Remove this comment to see the full error message
        point = { x: xValue, y: yValue, thumbnail: thumbnailLink, $raw: point.$raw };

        addPointToSeries(point, series, ySeriesName);
      });
    } else {
      addPointToSeries(point, series, seriesName);
    }
  });

  return series;
}
