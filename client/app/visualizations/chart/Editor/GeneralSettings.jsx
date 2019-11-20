import { isArray, map, mapValues, includes, some, each, difference } from 'lodash';
import React, { useMemo } from 'react';
import Select from 'antd/lib/select';
import Checkbox from 'antd/lib/checkbox';
import { EditorPropTypes } from '@/visualizations';

import ChartTypeSelect from './ChartTypeSelect';
import ColumnMappingSelect from './ColumnMappingSelect';

function getAvailableColumnMappingTypes(options) {
  const result = ['x', 'y'];

  if (!includes(['custom', 'heatmap'], options.globalSeriesType)) {
    result.push('series');
  }

  if (some(options.seriesOptions, { type: 'bubble' })) {
    result.push('size');
  }

  if (some(options.seriesOptions, { type: 'heatmap' })) {
    result.push('zVal');
  }

  if (!includes(['custom', 'heatmap'], options.globalSeriesType)) {
    result.push('yError');
  }

  return result;
}

function getMappedColumns(options, availableColumns) {
  const mappedColumns = {};
  const availableTypes = getAvailableColumnMappingTypes(options);
  each(availableTypes, (type) => {
    mappedColumns[type] = ColumnMappingSelect.MappingTypes[type].multiple ? [] : null;
  });

  availableColumns = map(availableColumns, c => c.name);
  const usedColumns = [];

  each(options.columnMapping, (type, column) => {
    if (includes(availableColumns, column) && includes(availableTypes, type)) {
      const { multiple } = ColumnMappingSelect.MappingTypes[type];
      if (multiple) {
        mappedColumns[type].push(column);
      } else {
        mappedColumns[type] = column;
      }
      usedColumns.push(column);
    }
  });

  return {
    mappedColumns,
    unusedColumns: difference(availableColumns, usedColumns),
  };
}

function mappedColumnsToColumnMappings(mappedColumns) {
  const result = {};
  each(mappedColumns, (value, type) => {
    if (isArray(value)) {
      each(value, (v) => {
        result[v] = type;
      });
    } else {
      if (value) {
        result[value] = type;
      }
    }
  });
  return result;
}

export default function GeneralSettings({ options, data, onOptionsChange }) {
  const { mappedColumns, unusedColumns } = useMemo(
    () => getMappedColumns(options, data.columns),
    [options, data.columns],
  );

  function handleGlobalSeriesTypeChange(globalSeriesType) {
    onOptionsChange({
      globalSeriesType,
      showDataLabels: globalSeriesType === 'pie',
      seriesOptions: mapValues(options.seriesOptions, series => ({
        ...series,
        type: globalSeriesType,
      })),
    });
  }

  function handleColumnMappingChange(column, type) {
    const columnMapping = mappedColumnsToColumnMappings({
      ...mappedColumns,
      [type]: column,
    });
    onOptionsChange({ columnMapping }, false);
  }

  return (
    <React.Fragment>
      <div className="m-b-15">
        <label htmlFor="chart-editor-global-series-type">Chart Type</label>
        <ChartTypeSelect
          id="chart-editor-global-series-type"
          className="w-100"
          data-test="Chart.GlobalSeriesType"
          defaultValue={options.globalSeriesType}
          onChange={handleGlobalSeriesTypeChange}
        />
      </div>

      {map(mappedColumns, (value, type) => (
        <ColumnMappingSelect
          key={type}
          type={type}
          value={value}
          availableColumns={unusedColumns}
          onChange={handleColumnMappingChange}
        />
      ))}

      {includes(['pie'], options.globalSeriesType) && (
        <div className="m-b-15">
          <label htmlFor="chart-editor-pie-direction">Direction</label>
          <Select
            id="chart-editor-pie-direction"
            className="w-100"
            data-test="Chart.PieDirection"
            defaultValue={options.direction.type}
            onChange={type => onOptionsChange({ direction: { type } })}
          >
            <Select.Option value="counterclockwise" data-test="Chart.PieDirection.Counterclockwise">Counterclockwise</Select.Option>
            <Select.Option value="clockwise" data-test="Chart.PieDirection.Clockwise">Clockwise</Select.Option>
          </Select>
        </div>
      )}

      {!includes(['custom', 'heatmap'], options.globalSeriesType) && (
        <div className="m-b-15">
          <label htmlFor="chart-editor-show-legend">
            <Checkbox
              id="chart-editor-show-legend"
              data-test="Chart.ShowLegend"
              defaultChecked={options.legend.enabled}
              onChange={event => onOptionsChange({ legend: { enabled: event.target.checked } })}
            />
            <span>Show Legend</span>
          </label>
        </div>
      )}

      {includes(['box'], options.globalSeriesType) && (
        <div className="m-b-15">
          <label htmlFor="chart-editor-show-points">
            <Checkbox
              id="chart-editor-show-points"
              data-test="Chart.ShowPoints"
              defaultChecked={options.showpoints}
              onChange={event => onOptionsChange({ showpoints: event.target.checked })}
            />
            <span>Show All Points</span>
          </label>
        </div>
      )}

      {!includes(['custom', 'heatmap'], options.globalSeriesType) && (
        <div className="m-b-15">
          <label htmlFor="chart-editor-stacking">Stacking</label>

          <Select
            id="chart-editor-stacking"
            className="w-100"
            data-test="Chart.Stacking"
            defaultValue={options.series.stacking}
            disabled={!includes(['line', 'area', 'column'], options.globalSeriesType)}
            onChange={stacking => onOptionsChange({ series: { stacking } })}
          >
            <Select.Option value={null} data-test="Chart.Stacking.Disabled">Disabled</Select.Option>
            <Select.Option value="stack" data-test="Chart.Stacking.Stack">Stack</Select.Option>
          </Select>
        </div>
      )}

      {includes(['line', 'area', 'column'], options.globalSeriesType) && (
        <div className="m-b-15">
          <label htmlFor="chart-editor-normalize-values">
            <Checkbox
              id="chart-editor-normalize-values"
              data-test="Chart.NormalizeValues"
              defaultChecked={options.series.percentValues}
              onChange={event => onOptionsChange({ series: { percentValues: event.target.checked } })}
            />
            <span>Normalize values to percentage</span>
          </label>
        </div>
      )}

      {!includes(['custom', 'heatmap', 'bubble', 'scatter'], options.globalSeriesType) && (
        <div className="m-b-15">
          <label className="d-flex align-items-center" htmlFor="chart-editor-missing-values">Missing and NULL values</label>
          <Select
            id="chart-editor-missing-values"
            className="w-100"
            data-test="Chart.MissingValues"
            defaultValue={options.missingValuesAsZero ? 1 : 0}
            onChange={value => onOptionsChange({ missingValuesAsZero: !!value })}
          >
            <Select.Option value={0} data-test="Chart.MissingValues.Keep">Do not display in chart</Select.Option>
            <Select.Option value={1} data-test="Chart.MissingValues.Zero">Convert to 0 and display in chart</Select.Option>
          </Select>
        </div>
      )}
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
