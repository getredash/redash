import { isNil, each, forOwn, sortBy, values } from 'lodash';

function addPointToSeries(point, seriesCollection, seriesName) {
  if (seriesCollection[seriesName] === undefined) {
    seriesCollection[seriesName] = {
      name: seriesName,
      type: 'column',
      data: [],
    };
  }

  seriesCollection[seriesName].data.push(point);
}

export default function getChartData(data, options) {
  const series = {};

  const mappings = options.columnMapping;

  each(data, (row) => {
    let point = { $raw: row };
    let seriesName = null;
    let xValue = 0;
    const yValues = {};
    let eValue = null;
    let sizeValue = null;
    let zValue = null;

    forOwn(row, (v, definition) => {
      definition = '' + definition;
      const definitionParts = definition.split('::') || definition.split('__');
      const name = definitionParts[0];
      const type = mappings ? mappings[definition] : definitionParts[1];
      let value = v;

      if (type === 'unused') {
        return;
      }

      if (type === 'x') {
        xValue = value;
        point[type] = value;
      }
      if (type === 'y') {
        if (value == null) {
          value = 0;
        }
        yValues[name] = value;
        point[type] = value;
      }
      if (type === 'yError') {
        eValue = value;
        point[type] = value;
      }

      if (type === 'series') {
        seriesName = String(value);
      }

      if (type === 'size') {
        point[type] = value;
        sizeValue = value;
      }

      if (type === 'zVal') {
        point[type] = value;
        zValue = value;
      }

      if (type === 'multiFilter' || type === 'multi-filter') {
        seriesName = String(value);
      }
    });

    if (isNil(seriesName)) {
      each(yValues, (yValue, ySeriesName) => {
        point = { x: xValue, y: yValue, $raw: point.$raw };
        if (eValue !== null) {
          point.yError = eValue;
        }

        if (sizeValue !== null) {
          point.size = sizeValue;
        }

        if (zValue !== null) {
          point.zVal = zValue;
        }
        addPointToSeries(point, series, ySeriesName);
      });
    } else {
      addPointToSeries(point, series, seriesName);
    }
  });
  return sortBy(values(series), ({ name }) => {
    if (options.seriesOptions[name]) {
      return options.seriesOptions[name].zIndex;
    }
    return 0;
  });
}
