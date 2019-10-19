import { isFinite, map, sortBy, every, includes } from 'lodash';
import d3 from 'd3';
import React, { useMemo } from 'react';
import { RendererPropTypes } from '@/visualizations';
import ColorPalette from '@/visualizations/ColorPalette';
import { normalizeValue } from '@/visualizations/chart/plotly/utils'; // TODO: wtf??

import './renderer.less';

function formatPercentage(value) {
  if (value < 0.01) {
    return '<0.01%';
  }
  if (value > 1000) {
    return '>1000%';
  }
  return value.toFixed(2) + '%';
}

function prepareData(rows, options) {
  if (rows.length === 0) {
    return [];
  }
  const data = map(rows, row => ({
    step: normalizeValue(row[options.stepCol.colName]),
    value: Number(row[options.valueCol.colName]),
    sortVal: options.autoSort ? '' : row[options.sortKeyCol.colName],
  }));
  let sortedData;
  if (options.autoSort) {
    sortedData = sortBy(data, 'value').reverse();
  } else {
    sortedData = sortBy(data, 'sortVal');
  }

  // Column validity
  if (sortedData[0].value === 0 || !every(sortedData, d => isFinite(d.value))) {
    return;
  }

  const maxVal = d3.max(data, d => d.value);
  sortedData.forEach((d, i) => {
    d.pctMax = (d.value / maxVal) * 100.0;
    d.pctPrevious = i === 0 ? 100.0 : (d.value / sortedData[i - 1].value) * 100.0;
  });

  return sortedData.slice(0, 100);
}

function isValid(data, options) {
  const availableColumns = map(data.columns, col => col.name);

  const isStepColValid = includes(availableColumns, options.stepCol.colName);
  const isValueColValid = includes(availableColumns, options.valueCol.colName);
  const isSortColValid = options.autoSort ||
    (!options.autoSort && includes(availableColumns, options.sortKeyCol.colName));

  return isStepColValid && isValueColValid && isSortColValid;
}

export default function Renderer({ data, options }) {
  const funnelData = useMemo(() => prepareData(data.rows, options), [data, options]);

  if (!isValid(data, options) || (funnelData.length === 0)) {
    return null;
  }

  const maxToPrevious = d3.max(funnelData, d => d.pctPrevious);

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
                  <div className="value">{d.value.toLocaleString()}</div>
                </div>
              </td>
              <td className="col-xs-2 text-center">{formatPercentage(d.pctMax)}</td>
              <td className="col-xs-2">
                <div className="container">
                  <div
                    className="bar"
                    style={{ background: ColorPalette.Gray, opacity: '0.2', width: (d.pctPrevious / maxToPrevious) * 100.0 + '%' }}
                  />
                  <div className="value">{formatPercentage(d.pctPrevious)}</div>
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
