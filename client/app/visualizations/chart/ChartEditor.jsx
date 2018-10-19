/* eslint-disable jsx-a11y/label-has-for, jsx-a11y/no-static-element-interactions */

import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import Popover from 'antd/lib/popover';
import 'antd/lib/popover/style';
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
    this.state = {
      currentTab: 'general',
    };

    function axisOptions(getColumnsState) {
      return () => (
        map(
          filter(
            props.data.columns,
            c => !includes(map(filter(getColumnsState(), cc => cc !== null), 'value'), c.name),
          ),
          c => ({ value: c.name, label: <span>{c.name} <small className="text-muted">{c.type}</small></span> }),
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
      type => this.updateOptions({ yAxis: [{ ...yAxes[0], type: type.value }, yAxes[1]] }),
      type => this.updateOptions({ yAxis: [yAxes[0], { ...yAxes[1], type: type.value }] }),
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

  // XXX See also GridEditor.updateOptions
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

  changeTab = (event) => {
    this.setState({ currentTab: event.target.dataset.tabname });
  }

  chartTypeChanged = (selected) => {
    const sOpts = this.props.options.seriesOptions;
    this.updateOptions({
      globalSeriesType: selected.value,
      showDataLabels: this.props.options.globalSeriesType === 'pie',
      seriesOptions: each({ ...sOpts }, (o) => { o.type = selected.value; }),
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
  updateXAxis = ({ value: x }) => this.updateColumn({ x })
  updateYAxis = (ys) => {
    const newColMap = { ...this.props.options.columnMapping };
    each(ys, ({ value: col }) => { newColMap[col] = 'y'; });
    this.updateOptions({ columnMapping: newColMap });
  }
  updateGroupby = ({ value: groupby }) => this.updateColumn({ groupby })
  updateSizeColumn = ({ value: size }) => this.updateColumn({ size })
  updateErrorColumn = ({ value: yError }) => this.updateColumn({ yError })
  updateStacking = ({ value: stacking }) => this.updateOptions({
    series: { ...this.props.options.series, stacking },
  })
  updateSeriesList = seriesList => this.updateOptions({ seriesList })
  updateSeriesOptions = seriesOptions => this.updateOptions({ seriesOptions })
  updateValuesOptions = valuesOptions => this.updateOptions({ valuesOptions })
  updateCustomCode = customCode => this.updateOptions({ customCode })
  updateXAxisType = type => this.updateOptions({
    xAxis: {
      ...this.props.options.xAxis,
      type: type.value,
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
            clearable={false}
            options={[
              { label: 'Auto Detect', value: '-' },
              { label: 'Datetime', value: 'datetime' },
              { label: 'Linear', value: 'linear' },
              { label: 'Logarithmic', value: 'logarithmic' },
              { label: 'Category', value: 'category' },
            ]}
            value={yAxis.type}
            onChange={this.updateYAxisScale[i]}
          />
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
    const tabs = {
      general: (
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
              clearable={false}
              value={this.getXAxisColumn()}
              options={this.xAxisOptions()}
              onChange={this.updateXAxis}
            />
          </div>

          <div className={'form-group' + (this.getYAxisColumns().length > 0 ? '' : ' has-error')}>
            <label className="control-label">Y Columns</label>

            <Select
              placeholder="Choose columns..."
              value={this.getYAxisColumns()}
              options={this.yAxisOptions()}
              onChange={this.updateYAxis}
              multi
            />
          </div>

          {opts.globalSeriesType !== 'custom' ?
            <div className="form-group">
              <label className="control-label">Group by</label>
              <Select
                placeholder="Choose column..."
                value={this.getGroupby()}
                options={this.groupbyOptions()}
                onChange={this.updateGroupby}
              />
            </div> : ''}

          {some(opts.seriesOptions, { type: 'bubble' }) ?
            <div className="form-group">
              <label className="control-label">Bubble size column</label>
              <Select
                placeholder="Choose column..."
                value={this.getSizeColumn()}
                options={this.sizeColumnOptions()}
                onChange={this.updateSizeColumn}
              />
            </div> : '' }

          {opts.globalSeriesType !== 'custom' ?
            <div className="form-group">
              <label className="control-label">Errors column</label>
              <Select
                placeholder="Choose column..."
                value={this.getErrorColumn()}
                options={this.xAxisOptions()}
                onChange={this.updateErrorColumn}
              />
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
                options={[{ value: null, label: 'Disabled' }, { value: 'stack', label: 'Stack' }]}
                value={opts.series ? opts.series.stacking : null}
                onChange={this.updateStacking}
              />
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
            </React.Fragment> : ''}
        </div>
      ),
      xAxis: (
        <div className="m-t-10 m-b-10">
          <div className="form-group">
            <label className="control-label">Scale</label>
            <Select
              placeholder="Choose scale..."
              value={opts.xAxis && opts.xAxis.type}
              options={map(
                ['datetime', 'linear', 'logarithmic', 'category'],
                value => ({ label: capitalize(value), value }),
              )}
              onChange={this.updateXAxisType}
            />
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
      ),
      yAxis: (
        <div className="m-t-10 m-b-10">
          {this.yAxisPanel('Left', 0)}
          {this.yAxisPanel('Right', 1)}
        </div>
      ),
      series: (
        <ChartSeriesEditor
          seriesOptions={opts.seriesOptions}
          seriesList={seriesList}
          type={opts.globalSeriesType}
          updateSeriesList={this.updateSeriesList}
          updateSeriesOptions={this.updateSeriesOptions}
          clientConfig={this.props.clientConfig}
        />
      ),
      colors: (
        <ChartColorEditor
          list={pie ? valuesList : seriesList}
          options={pie ? opts.valuesOptions : opts.seriesOptions}
          updateOptions={pie ? this.updateValuesOptions : this.updateSeriesOptions}
        />
      ),
      dataLabels: (
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
      ),
    };
    // XXX 'ng-click' retained here merely because of existing CSS
    return (
      <div>
        <ul className="tab-nav">
          <li className={this.state.currentTab === 'general' ? 'active' : ''}>
            <a data-tabname="general" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>General</a>
          </li>
          {opts.globalSeriesType !== 'custom' ?
            <React.Fragment>
              <li className={this.state.currentTab === 'xAxis' ? 'active' : ''}>
                <a data-tabname="xAxis" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>X Axis</a>
              </li>
              <li className={this.state.currentTab === 'yAxis' ? 'active' : ''}>
                <a data-tabname="yAxis" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Y Axis</a>
              </li>
              <li className={this.state.currentTab === 'series' ? 'active' : ''}>
                <a data-tabname="series" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Series</a>
              </li>
              <li className={this.state.currentTab === 'colors' ? 'active' : ''}>
                <a data-tabname="colors" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Colors</a>
              </li>
              <li className={this.state.currentTab === 'dataLabels' ? 'active' : ''}>
                <a data-tabname="dataLabels" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Data Labels</a>
              </li>

            </React.Fragment> : ''}
        </ul>
        {tabs[this.state.currentTab]}
      </div>
    );
  }
}
