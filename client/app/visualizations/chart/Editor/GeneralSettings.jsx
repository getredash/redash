import { mapValues, includes } from 'lodash';
import React from 'react';
import Select from 'antd/lib/select';
import Switch from 'antd/lib/switch';
import { EditorPropTypes } from '@/visualizations';

import ChartTypeSelect from './ChartTypeSelect';

export default function GeneralSettings({ options, onOptionsChange }) {
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
            <Select.Option value="counterclockwise">Counterclockwise</Select.Option>
            <Select.Option value="clockwise">Clockwise</Select.Option>
          </Select>
        </div>
      )}

      {!includes(['custom', 'heatmap'], options.globalSeriesType) && (
        <div className="m-b-15">
          <label className="d-flex align-items-center" htmlFor="chart-editor-show-legend">
            <Switch
              id="chart-editor-show-legend"
              data-test="Chart.ShowLegend"
              defaultChecked={options.legend.enabled}
              onChange={enabled => onOptionsChange({ legend: { enabled } })}
            />
            <span className="m-l-10">Show Legend</span>
          </label>
        </div>
      )}

      {includes(['box'], options.globalSeriesType) && (
        <div className="m-b-15">
          <label className="d-flex align-items-center" htmlFor="chart-editor-show-points">
            <Switch
              id="chart-editor-show-points"
              data-test="Chart.ShowPoints"
              defaultChecked={options.showpoints}
              onChange={showpoints => onOptionsChange({ showpoints })}
            />
            <span className="m-l-10">Show All Points</span>
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
            <Select.Option value={null}>Disabled</Select.Option>
            <Select.Option value="stack">Stack</Select.Option>
          </Select>
        </div>
      )}

      {includes(['line', 'area', 'column'], options.globalSeriesType) && (
        <div className="m-b-15">
          <label className="d-flex align-items-center" htmlFor="chart-editor-normalize-values">
            <Switch
              id="chart-editor-normalize-values"
              data-test="Chart.NormalizeValues"
              defaultChecked={options.series.percentValues}
              onChange={percentValues => onOptionsChange({ series: { percentValues } })}
            />
            <span className="m-l-10">Normalize values to percentage</span>
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
            <Select.Option value={0}>keep</Select.Option>
            <Select.Option value={1}>convert to 0</Select.Option>
          </Select>
        </div>
      )}
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
