import { map, sortBy, maxBy } from 'lodash';
import React, { useMemo } from 'react';
import { RendererPropTypes } from '@/visualizations';
import ColorPalette from '@/visualizations/ColorPalette';
import { createNumberFormatter } from '@/lib/value-format';

import './renderer.less';

function prepareData(rows, options) {
  if (rows.length === 0) {
    return [];
  }

  rows = [...rows];
  if (options.sortKeyCol.colName) {
    rows = sortBy(rows, options.sortKeyCol.colName);
  }
  if (options.sortKeyCol.reverse) {
    rows = rows.reverse();
  }

  const data = map(rows, row => ({
    step: row[options.stepCol.colName],
    value: parseFloat(row[options.valueCol.colName]) || 0.0,
  }));

  const maxVal = maxBy(data, d => d.value).value;
  data.forEach((d, i) => {
    d.pctMax = (d.value / maxVal) * 100.0;
    d.pctPrevious = (i === 0) || (d.value === data[i - 1].value) ? 100.0 : (d.value / data[i - 1].value) * 100.0;
  });

  return data.slice(0, options.itemsLimit);
}

function isValid(data, options) {
  return options.stepCol.colName && options.valueCol.colName;
}

export default function Renderer({ data, options }) {
  const funnelData = useMemo(() => prepareData(data.rows, options), [data, options]);

  const formatValue = useMemo(() => createNumberFormatter(options.numberFormat), [options.numberFormat]);

  const formatPercentValue = useMemo(() => {
    const format = createNumberFormatter(options.percentFormat);
    return (value) => {
      if (value < options.percentValuesRange.min) {
        return `<${format(options.percentValuesRange.min)}`;
      }
      if (value > options.percentValuesRange.max) {
        return `>${format(options.percentValuesRange.max)}`;
      }
      return format(value);
    };
  }, [options.percentFormat, options.percentValuesRange]);

  if (!isValid(data, options) || (funnelData.length === 0)) {
    return null;
  }

  const maxToPrevious = maxBy(funnelData, d => d.pctPrevious).pctPrevious;

  return (
    <div className="funnel-visualization-container">
      <table className="table table-condensed table-hover table-borderless">
        <thead>
          <tr>
            <th>{options.stepCol.displayAs}</th>
            <th className="text-center">{options.valueCol.displayAs}</th>
            <th className="text-center">% Max</th>
            <th className="text-center">% Previous</th>
          </tr>
        </thead>
        <tbody>
          {map(funnelData, d => (
            <tr key={d.step}>
              <td className="col-xs-3 step" title={d.step}>{d.step}</td>
              <td className="col-xs-5">
                <div className="container">
                  <div
                    className="bar centered"
                    style={{ background: ColorPalette.Cyan, width: d.pctMax + '%' }}
                  />
                  <div className="value">{formatValue(d.value)}</div>
                </div>
              </td>
              <td className="col-xs-2 text-center">{formatPercentValue(d.pctMax)}</td>
              <td className="col-xs-2">
                <div className="container">
                  <div
                    className="bar"
                    style={{ background: ColorPalette.Gray, opacity: '0.2', width: (d.pctPrevious / maxToPrevious) * 100.0 + '%' }}
                  />
                  <div className="value">{formatPercentValue(d.pctPrevious)}</div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
