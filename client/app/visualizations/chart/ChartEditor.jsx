/* eslint-disable jsx-a11y/label-has-for, jsx-a11y/no-static-element-interactions */

import React from 'react';
import PropTypes from 'prop-types';
import Select from 'antd/lib/select';
import 'antd/lib/select/style';
import Popover from 'antd/lib/popover';
import 'antd/lib/popover/style';
import Tabs from 'antd/lib/tabs';
import 'antd/lib/tabs/style';

import { capitalize, compact, each, filter, findKey, fromPairs, has, includes, invert, keys, map, some, sortBy, toPairs } from 'lodash';

import { QueryData } from '@/components/proptypes';
import ChartTypePicker from './ChartTypePicker';
import ChartSeriesEditor from './ChartSeriesEditor';
import ChartColorEditor from './ChartColorEditor';
import ChartRenderer from './ChartRenderer';

const DEFAULT_CUSTOM_CODE = `// Available variables are x, ys, element, and Plotly
// Type console.log(x, ys); for more info about x and ys
// To plot your graph call Plotly.plot(element, ...)
// Plotly examples and docs: https://plot.ly/javascript/`;
const templateHint = (
  <React.Fragment>
    <div className="p-b-5">Use special names to access additional properties:</div>
    <div><code>{'{{ @@name }}'}</code> series name;</div>
    <div><code>{'{{ @@x }}'}</code> x-value;</div>
    <div><code>{'{{ @@y }}'}</code> y-value;</div>
    <div><code>{'{{ @@yPercent }}'}</code> relative y-value;</div>
    <div><code>{'{{ @@yError }}'}</code> y deviation;</div>
    <div><code>{'{{ @@size }}'}</code> bubble size;</div>
    <div className="p-t-5">Also, all query result columns can be referenced using
      <code className="text-nowrap">{'{{ column_name }}'}</code> syntax.
    </div>
  </React.Fragment>
);


function PopoverHelp(props) {
  return (
    <Popover content={props.children} trigger="click">
      <span className="m-l-5">
        <i className="fa fa-question-circle" />
      </span>
    </Popover>
  );
}

PopoverHelp.propTypes = { children: PropTypes.arrayOf(PropTypes.node).isRequired };

export default class ChartEditor extends React.Component {
  static propTypes = {
    data: QueryData.isRequired,
    options: ChartRenderer.Options.isRequired,
    updateOptions: PropTypes.func.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    clientConfig: PropTypes.object.isRequired,
  }


  constructor(props) {
    super(props);

    function axisOptions(getColumnsState) {
      return () => (
        map(
          filter(
            props.data.columns,
            c => !includes(map(filter(getColumnsState(), cc => cc !== null), 'value'), c.name),
          ),
          c => (
            <Select.Option key={c.name}>
              <span>{c.name} <small className="text-muted">{c.type}</small></span>
            </Select.Option>),
        ));
    }
    const yAxisColumns = () => this.props.options.yAxisColumns || [];
    this.xAxisOptions = axisOptions(() => [
      ...yAxisColumns(),
      this.props.options.groupby,
    ]);
    this.yAxisOptions = axisOptions(() => [
      this.props.options.xAxisColumn,
      this.props.options.groupby,
    ]);
    this.groupbyOptions = axisOptions(() => [
      this.props.options.xAxisColumn,
      ...yAxisColumns(),
    ]);
    this.sizeColumnOptions = axisOptions(() => [
      ...yAxisColumns(),
      this.props.options.groupby,
    ]);

    const yAxes = props.options.yAxis;
    this.updateYAxisText = [
      e => this.updateOptions({ yAxis: [{ ...yAxes[0], title: { text: e.target.value } }, yAxes[1]] }),
      e => this.updateOptions({ yAxis: [yAxes[0], { ...yAxes[1], title: { text: e.target.value } }] }),
    ];
    this.updateYAxisScale = [
      type => this.updateOptions({ yAxis: [{ ...yAxes[0], type }, yAxes[1]] }),
      type => this.updateOptions({ yAxis: [yAxes[0], { ...yAxes[1], type }] }),
    ];
    this.updateYAxisRangeMin = [
      e => this.updateOptions({ yAxis: [{ ...yAxes[0], rangeMin: e.target.value }, yAxes[1]] }),
      e => this.updateOptions({ yAxis: [yAxes[0], { ...yAxes[1], rangeMin: e.target.value }] }),
    ];
    this.updateYAxisRangeMax = [
      e => this.updateOptions({ yAxis: [{ ...yAxes[0], rangeMax: e.target.value }, yAxes[1]] }),
      e => this.updateOptions({ yAxis: [yAxes[0], { ...yAxes[1], rangeMax: e.target.value }] }),
    ];
  }

  getYAxisColumns = () => compact(map(this.props.options.columnMapping, (v, k) => v === 'y' && k))
  getXAxisColumn = () => findKey(this.props.options.columnMapping, c => c === 'x')
  getErrorColumn = () => findKey(this.props.options.columnMapping, c => c === 'yError')
  getSizeColumn = () => findKey(this.props.options.columnMapping, c => c === 'size')
  getGroupby = () => findKey(this.props.options.columnMapping, c => c === 'groupby')

  updateOptions = (newOptions) => {
    const opts = this.props.options;
    // Cope here with column mapping changes - need to recompute seriesOptions/valuesOptions
    if (has(newOptions, 'columnMapping')) {
      const seriesNames = ChartRenderer.getSeriesNames(newOptions.columnMapping, this.props.data.columns);
      // build new seriesOptions to cover new columns in data
      newOptions.seriesOptions = fromPairs(map(
        seriesNames,
        n => [n, opts.seriesOptions[n] || { type: opts.globalSeriesType, yAxis: 0 }],
      ));
      if (opts.globalSeriesType === 'pie') {
        const xColumn = findKey(newOptions.columnMapping, v => v === 'x');
        const uniqueValuesNames = new Set(map(this.props.data.rows, xColumn));
        newOptions.valuesOptions = fromPairs(map(uniqueValuesNames, n => opts.valuesOptions[n] || {}));
      }
      // update seriesList, valuesList to reflect new columns
    }
    return this.props.updateOptions(newOptions);
  }

  updateColumn = newRoles => this.updateOptions({
    columnMapping: {
      ...this.props.options.columnMapping,
      ...(invert(newRoles)),
    },
  })

  chartTypeChanged = (selected) => {
    const sOpts = this.props.options.seriesOptions;
    this.updateOptions({
      globalSeriesType: selected,
      showDataLabels: this.props.options.globalSeriesType === 'pie',
      seriesOptions: each({ ...sOpts }, (o) => { o.type = selected; }),
    });
  }

  toggleDataLabels = e => this.updateOptions({ showDataLabels: e.target.checked })
  toggleShowPoints = e => this.updateOptions({ showpoints: e.target.checked })
  toggleConsoleLogs = e => this.updateOptions({ enableConsoleLogs: e.target.checked })
  toggleAutoRedraw = e => this.updateOptions({ autoRedraw: e.target.checked })

  toggleShowLegend = e => this.updateOptions({
    legend: {
      ...this.props.options.legend,
      enabled: e.target.checked,
    },
  })

  togglePercentValues = e => this.updateOptions({
    series: {
      ...this.props.options.series,
      percentValues: e.target.checked,
    },
  })

  toggleSortX = e => this.updateOptions({ sortX: e.target.checked })

  toggleXLabels = e => this.updateOptions({
    xAxis: {
      ...this.props.options.xAxis,
      labels: {
        ...this.props.options.xAxis.labels,
        enabled: e.target.checked,
      },
    },
  })

  updateXAxisLabelLength = xAxisLabelLength => this.updateOptions({ xAxisLabelLength })
  updateXAxis = x => this.updateColumn({ x })
  updateYAxis = (ys) => {
    const newColMap = { ...this.props.options.columnMapping };
    each(ys, (col) => { newColMap[col] = 'y'; });
    this.updateOptions({ columnMapping: newColMap });
  }
  updateGroupby = groupby => this.updateColumn({ groupby })
  updateSizeColumn = size => this.updateColumn({ size })
  updateErrorColumn = yError => this.updateColumn({ yError })
  updateStacking = stacking => this.updateOptions({
    series: { ...this.props.options.series, stacking },
  })
  updateSeriesList = seriesList => this.updateOptions({ seriesList })
  updateSeriesOptions = seriesOptions => this.updateOptions({ seriesOptions })
  updateValuesOptions = valuesOptions => this.updateOptions({ valuesOptions })
  updateCustomCode = customCode => this.updateOptions({ customCode })
  updateXAxisType = type => this.updateOptions({
    xAxis: {
      ...this.props.options.xAxis,
      type,
    },
  })
  updateXAxisName = e => this.updateOptions({
    xAxis: {
      ...this.props.options.xAxis,
      title: {
        ...this.props.options.xAxis.title,
        text: e.target.value,
      },
    },
  })
  updateNumberFormat = e => this.updateOptions({ numberFormat: e.target.value })
  updatePercentFormat = e => this.updateOptions({ percentFormat: e.target.value })
  updateDateTimeFormat = e => this.updateOptions({ dateTImeFormat: e.target.value })
  updateTextFormat = e => this.updateOptions({ textFormat: e.target.value })
  yAxisPanel = (side, i) => {
    const yAxis = this.props.options.yAxis[i];
    return (
      <div>
        <h4>{side} Y Axis</h4>
        <div className="form-group">
          <label className="control-label">Scale</label>
          <Select
            placeholder="Choose Scale..."
            onChange={this.updateYAxisScale[i]}
            value={yAxis.type}
          >
            <Select.Option value="-">Auto Detect</Select.Option>
            <Select.Option value="datetime">Datetime</Select.Option>
            <Select.Option value="linear">Linear</Select.Option>
            <Select.Option value="logarithmic">Logarithmic</Select.Option>
            <Select.Option value="category">Category</Select.Option>
          </Select>
        </div>
        <div className="form-group">
          <label className="control-label">Name</label>
          <input value={yAxis.title && yAxis.title.text} onChange={this.updateYAxisText[i]} type="text" className="form-control" />
        </div>
        <div className="form-group">
          <label className="control-label">Min Value</label>
          <input value={yAxis.rangeMin || ''} onChange={this.updateYAxisRangeMin[i]} type="number" step="any" placeholder="Auto" className="form-control" />
        </div>
        <div className="form-group">
          <label className="control-label">Max Value</label>
          <input value={yAxis.rangeMax || ''} onChange={this.updateYAxisRangeMax[i]} type="number" step="any" placeholder="Auto" className="form-control" />
        </div>
      </div>
    );
  }

  render() {
    const opts = this.props.options;
    const seriesList = (opts.seriesList ||
                        map(sortBy(toPairs(opts.seriesOptions), '1.zIndex'), 0));
    const valuesList = keys(opts.valuesOptions).sort();
    const pie = opts.globalSeriesType === 'pie';
    return (
      <div>
        <Tabs defaultActiveKey="general" animated={false} tabBarGutter={0}>
          <Tabs.TabPane key="general" tab="General">
            <div className="m-t-10 m-b-10">
              <div className="form-group">
                <label className="control-label">Chart Type</label>
                <ChartTypePicker
                  value={opts.globalSeriesType}
                  onChange={this.chartTypeChanged}
                  clientConfig={this.props.clientConfig}
                />
              </div>
              <div className={'form-group' + (!this.getXAxisColumn() ? ' has-error' : '')}>
                <label className="control-label">X Column</label>
                <Select
                  placeholder="Choose column..."
                  value={this.getXAxisColumn()}
                  onChange={this.updateXAxis}
                >
                  {this.xAxisOptions()}
                </Select>
              </div>

              <div className={'form-group' + (this.getYAxisColumns().length > 0 ? '' : ' has-error')}>
                <label className="control-label">Y Columns</label>

                <Select
                  placeholder="Choose columns..."
                  value={this.getYAxisColumns()}
                  onChange={this.updateYAxis}
                  mode="multiple"
                >
                  {this.yAxisOptions()}
                </Select>
              </div>

              {opts.globalSeriesType !== 'custom' ?
                <div className="form-group">
                  <label className="control-label">Group by</label>
                  <Select
                    placeholder="Choose column..."
                    value={this.getGroupby()}
                    onChange={this.updateGroupby}
                  >
                    {this.groupbyOptions()}
                  </Select>
                </div> : ''}

              {some(opts.seriesOptions, { type: 'bubble' }) ?
                <div className="form-group">
                  <label className="control-label">Bubble size column</label>
                  <Select
                    placeholder="Choose column..."
                    value={this.getSizeColumn()}
                    onChange={this.updateSizeColumn}
                  >
                    {this.sizeColumnOptions()}
                  </Select>
                </div> : '' }

              {opts.globalSeriesType !== 'custom' ?
                <div className="form-group">
                  <label className="control-label">Errors column</label>
                  <Select
                    placeholder="Choose column..."
                    value={this.getErrorColumn()}
                    onChange={this.updateErrorColumn}
                  >
                    {this.xAxisOptions()}
                  </Select>
                </div> : ''}

              {opts.globalSeriesType === 'custom' ?
                <div className="checkbox">
                  <label>
                    <input
                      type="checkbox"
                      onChange={this.toggleShowLegend}
                      checked={opts.legend.enabled}
                    />
                    <i className="input-helper" /> Show Legend
                  </label>
                </div> : ''}

              {opts.globalSeriesType === 'box' ?
                <div className="checkbox">
                  <label>
                    <input
                      type="checkbox"
                      onChange={this.toggleShowPoints}
                      checked={opts.showpoints}
                    />
                    <i className="input-helper" /> Show All Points
                  </label>
                </div> : ''}

              {opts.globalSeriesType !== 'custom' ?
                <div className="form-group">
                  <label className="control-label">Stacking</label>
                  <Select
                    placeholder="Choose stacking..."
                    disabled={!includes(['line', 'area', 'column'], opts.globalSeriesType)}
                    value={opts.series ? opts.series.stacking : null}
                    onChange={this.updateStacking}
                  >
                    <Select.Option value={null}>Disabled</Select.Option>
                    <Select.Option value="stack">Stack</Select.Option>
                  </Select>
                </div> : '' }

              {includes(['line', 'area', 'column'], opts.globalSeriesType) ?
                <div className="checkbox">
                  <label className="control-label">
                    <input
                      type="checkbox"
                      onChange={this.togglePercentValues}
                      checked={opts.series.percentValues || false}
                    />
                    Normalize values to percentage
                  </label>
                </div> : ''}

              {opts.globalSeriesType === 'custom' ?
                <React.Fragment>
                  <div className="form-group">
                    <label className="control-label">Custom code</label>
                    <textarea
                      value={opts.customCode || DEFAULT_CUSTOM_CODE}
                      onChange={this.updateCustomCode}
                      className="form-control v-resizable"
                      rows="10"
                    />
                  </div>
                  <div className="checkbox">
                    <label>
                      <input
                        type="checkbox"
                        onChange={this.toggleConsoleLogs}
                        checked={opts.enableConsoleLogs || false}
                      />
                      <i className="input-helper" /> Show errors in the console
                    </label>
                  </div>
                  <div className="checkbox">
                    <label>
                      <input
                        type="checkbox"
                        onChange={this.toggleAutoRedraw}
                        checked={opts.autoRedraw || false}
                      />
                      <i className="input-helper" /> Auto update graph
                    </label>
                  </div>
                </React.Fragment> : null}
            </div>
          </Tabs.TabPane>
          {opts.globalSeriesType !== 'custom' ?
            <Tabs.TabPane key="xAxis" tab="X Axis">
              <div className="m-t-10 m-b-10">
                <div className="form-group">
                  <label className="control-label">Scale</label>
                  <Select
                    placeholder="Choose scale..."
                    value={opts.xAxis && opts.xAxis.type}
                    onChange={this.updateXAxisType}
                  >
                    {map(['datetime', 'linear', 'logarithmic', 'category'], value =>
                      <Select.Option key={value}>{capitalize(value)}</Select.Option>)}
                  </Select>
                </div>

                <div className="form-group">
                  <label className="control-label">Name</label>
                  <input value={(opts.xAxis && opts.xAxis.title && opts.xAxis.title.text) || ''} type="text" className="form-control" onChange={this.updateXAxisName} />
                </div>

                <div className="checkbox">
                  <label>
                    <input
                      type="checkbox"
                      onChange={this.toggleSortX}
                      checked={opts.sortX}
                    />
                    <i className="input-helper" /> Sort Values
                  </label>
                </div>

                <div className="checkbox">
                  <label>
                    <input
                      type="checkbox"
                      onChange={this.toggleXLabels}
                      checked={opts.xAxis.labels.enabled}
                    />
                    <i className="input-helper" /> Show Labels
                  </label>
                </div>

                <div className="form-group">
                  <label className="control-label">Label Length</label>
                  <input name="x-axis-label-length" type="number" className="form-control" value={opts.xAxisLabelLength} onChange={this.updateXAxisLabelLength} />
                  <span className="info">How many characters should X Axis Labels be truncated at in the legend?</span>
                </div>
              </div>
            </Tabs.TabPane> : null }
          {opts.globalSeriesType !== 'custom' ?
            <Tabs.TabPane key="yAxis" tab="Y Axis">
              <div className="m-t-10 m-b-10">
                {this.yAxisPanel('Left', 0)}
                {this.yAxisPanel('Right', 1)}
              </div>
            </Tabs.TabPane> : null }
          {opts.globalSeriesType !== 'custom' ?
            <Tabs.TabPane key="series" tab="Series">
              <ChartSeriesEditor
                seriesOptions={opts.seriesOptions}
                seriesList={seriesList}
                type={opts.globalSeriesType}
                updateSeriesList={this.updateSeriesList}
                updateSeriesOptions={this.updateSeriesOptions}
                clientConfig={this.props.clientConfig}
              />
            </Tabs.TabPane> : null }
          {opts.globalSeriesType !== 'custom' ?
            <Tabs.TabPane key="colors" tab="Colors">
              <ChartColorEditor
                list={pie ? valuesList : seriesList}
                options={pie ? opts.valuesOptions : opts.seriesOptions}
                updateOptions={pie ? this.updateValuesOptions : this.updateSeriesOptions}
              />
            </Tabs.TabPane> : null }
          {opts.globalSeriesType !== 'custom' ?
            <Tabs.TabPane key="dataLabels" tab="Data Labels">
              <div className="m-t-10 m-b-10">
                {includes(['line', 'area', 'column', 'scatter', 'pie'], opts.globalSeriesType) ?
                  <div className="checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={opts.showDataLabels || false}
                        onChange={this.toggleDataLabels}
                      /> Show data labels
                    </label>
                  </div> : null }

                <div className="form-group">
                  <label htmlFor="chart-editor-number-format">
                    Number Values Format
                    <PopoverHelp>
                      Format <a href="http://numeraljs.com/" rel="noopener noreferrer" target="_blank">specs.</a>
                    </PopoverHelp>
                  </label>
                  <input className="form-control" value={opts.numberFormat} onChange={this.updateNumberFormat} id="chart-editor-number-format" />
                </div>

                <div className="form-group">
                  <label htmlFor="chart-editor-percent-format">
                    Percent Values Format
                    <PopoverHelp>
                      Format <a href="http://numeraljs.com/" rel="noopener noreferrer" target="_blank">specs.</a>
                    </PopoverHelp>
                  </label>
                  <input className="form-control" value={opts.percentFormat} onChange={this.updatePercentFormat} id="chart-editor-percent-format" />
                </div>

                <div className="form-group">
                  <label htmlFor="chart-editor-datetime-format">
                    Date/Time Values Format
                    <PopoverHelp>
                      Format <a href="https://momentjs.com/docs/#/displaying/format/" rel="noopener noreferrer" target="_blank">specs.</a>
                    </PopoverHelp>
                  </label>
                  <input className="form-control" value={opts.dateTimeFormat} onChange={this.updateDateTimeFormat} id="chart-editor-datetime-format" />
                </div>

                <div className="form-group">
                  <label htmlFor="chart-editor-text">
                    Data Labels
                    <Popover content={templateHint} trigger="click" placement="topLeft">
                      <i className="m-l-5 fa fa-question-circle" />
                    </Popover>
                  </label>
                  <input className="form-control" value={opts.textFormat} onChange={this.updateTextFormat} id="chart-editor-text" placeholder="(auto)" />
                </div>
              </div>
            </Tabs.TabPane> : null}
        </Tabs>
      </div>
    );
  }
}
