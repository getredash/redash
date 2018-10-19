import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import Popover from 'antd/lib/popover';
import 'antd/lib/popover/style';
import { chain, capitalize, each, map, isString } from 'lodash';

import { QueryData } from '@/components/proptypes';
import ColorBox from './ColorBox';
import ChoroplethRenderer from './ChoroplethRenderer';

const ChoroplethPalette = ChoroplethRenderer.ChoroplethPalette;

const countryCodeTypes = {
  name: 'Short name',
  name_long: 'Full name',
  abbrev: 'Abbreviated name',
  iso_a2: 'ISO code (2 letters)',
  iso_a3: 'ISO code (3 letters)',
  iso_n3: 'ISO code (3 digits)',
};

const clusteringModes = {
  q: 'quantile',
  e: 'equidistant',
  k: 'k-means',
};

const legendPositions = {
  'top-left': 'top / left',
  'top-right': 'top / right',
  'bottom-left': 'bottom / left',
  'bottom-right': 'bottom / right',
};

function inferCountryCodeType(data, countryCodeField) {
  const regex = {
    iso_a2: /^[a-z]{2}$/i,
    iso_a3: /^[a-z]{3}$/i,
    iso_n3: /^[0-9]{3}$/i,
  };

  const result = chain(data)
    .reduce((memo, item) => {
      const value = item[countryCodeField];
      if (isString(value)) {
        each(regex, (r, k) => {
          memo[k] += r.test(value) ? 1 : 0;
        });
      }
      return memo;
    }, {
      iso_a2: 0,
      iso_a3: 0,
      iso_n3: 0,
    })
    .toPairs()
    .reduce((memo, item) => (item[1] > memo[1] ? item : memo))
    .value();

  return (result[1] / data.length) >= 0.9 ? result[0] : null;
}

const AlignButton = props => (
  <button
    type="button"
    className={'btn btn-default btn-md flex-fill' + (props.legend.alignText === props.direction ? ' active' : '')}
    onClick={() => props.updateLegend({ alignText: props.direction })}
  >
    <i className={'fa fa-align-' + props.direction} />
  </button>
);

AlignButton.propTypes = {
  legend: PropTypes.shape({
    alignText: PropTypes.oneOf(['left', 'right', 'center']).isRequired,
  }).isRequired,
  direction: PropTypes.oneOf(['left', 'right', 'center']).isRequired,
  updateLegend: PropTypes.func.isRequired,
};

export default class ChoroplethEditor extends React.Component {
  static propTypes = {
    data: QueryData.isRequired,
    options: ChoroplethRenderer.Options.isRequired,
    updateOptions: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'general',
    };
  }
  changeTab = (event) => {
    this.setState({ currentTab: event.target.dataset.tabname });
  }

  toggleTooltip = e => this.props.updateOptions({
    tooltip: {
      ...this.props.options.tooltip,
      enabled: e.target.checked,
    },
  })
  updateTooltipTemplate = e => this.props.updateOptions({
    tooltip: {
      ...this.props.options.tooltip,
      template: e.target.value,
    },
  })

  togglePopup = e => this.props.updateOptions({
    popup: {
      ...this.props.options.popup,
      enabled: e.target.checked,
    },
  })

  updatePopupTemplate = e => this.props.updateOptions({
    popup: {
      ...this.props.options.popup,
      template: e.target.value,
    },
  })

  toggleLegend = e => this.updateLegend({ visible: e.target.checked })
  updateLegendPosition = e => this.updateLegend({ position: e.target.value })
  updateLegend = legend => this.props.updateOptions({
    legend: {
      ...this.props.options.legend,
      ...legend,
    },
  })

  updateCountryCodeColumn = e => this.props.updateOptions({
    countryCodeColumn: e.target.value,
    countryCodeType: inferCountryCodeType(this.props.data.rows, e.target.value) ||
      this.props.options.countrycodeType,
  })

  updateCountryCodeType = e => this.props.updateOptions({ countryCodeType: e.target.value })
  updateValueColumn = e => this.props.updateOptions({ valueColumn: e.target.value })
  updateValueFormat = e => this.props.updateOptions({ valueFormat: e.target.value })
  updateValuePlaceholder = e => this.props.updateOptions({ noValuePlaceholder: e.target.value })

  render() {
    const opts = this.props.options;
    const formatSpecsPopover = (
      <React.Fragment>
        Format <a href="http://numeraljs.com/" rel="noopener noreferrer" target="_blank">specs.</a>
      </React.Fragment>);
    const templateHintPopover = (
      <React.Fragment>
        <div className="p-b-5">All query result columns can be referenced using <code>{'{{ column_name }}'}</code> syntax.</div>
        <div className="p-b-5">Use special names to access additional properties:</div>
        <div><code>{'{{ @@value }}'}</code> formatted value;</div>
        <div><code>{'{{ @@name }}'}</code> short country name;</div>
        <div><code>{'{{ @@name_long }}'}</code> full country name;</div>
        <div><code>{'{{ @@abbrev }}'}</code> abbreviated country name;</div>
        <div><code>{'{{ @@iso_a2 }}'}</code> two-letter ISO country code;</div>
        <div><code>{'{{ @@iso_a3 }}'}</code> three-letter ISO country code;</div>
        <div><code>{'{{ @@iso_n3 }}'}</code> three-digit ISO country code.</div>
        <div className="p-t-5">This syntax is applicable to tooltip and popup templates.</div>
      </React.Fragment>);

    const tabs = {
      general: (
        <div className="m-t-10 m-b-10">
          <div className="row">
            <div className="col-xs-6">
              <div className="form-group">
                <label>Country code column</label>
                <select value={opts.countryCodeColumn} className="form-control" onChange={this.updateCountryCodeColumn}>
                  {this.props.data.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="col-xs-6">
              <div className="form-group">
                <label>Country code type</label>
                <select value={opts.countryCodeType} className="form-control" onChange={this.updateCountryCodeType}>
                  {map(countryCodeTypes, (v, k) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-xs-6">
              <div className="form-group">
                <label>Value column</label>
                <select value={opts.valueColumn} className="form-control" onChange={this.updateValueColumn}>
                  {this.props.data.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="col-xs-6">
              <div className="form-group">
                <label htmlFor="legend-value-format">
                  Value format
                  <Popover trigger="click" placement="top" content={formatSpecsPopover}>
                    <span className="m-l-5"><i className="fa fa-question-circle" /></span>
                  </Popover>
                </label>
                <input
                  className="form-control"
                  id="legend-value-format"
                  value={opts.valueFormat}
                  onChange={this.updateValueFormat}
                />
              </div>
            </div>

            <div className="col-xs-6">
              <div className="form-group">
                <label htmlFor="legend-value-placeholder">Value placeholder</label>
                <input
                  className="form-control"
                  id="legend-value-placeholder"
                  value={opts.noValuePlaceholder}
                  onChange={this.updateValuePlaceholder}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>
              <input type="checkbox" checked={opts.legend.visible} onChange={this.toggleLegend} />
              Show legend
            </label>
          </div>
          <div className="row">
            <div className="col-xs-6">
              <div className="form-group">
                <label htmlFor="legend-position">Legend position</label>
                <select
                  className="form-control"
                  id="legend-position"
                  value={opts.legend.position}
                  disabled={!opts.legend.visible}
                  onChange={this.updateLegendPosition}
                >
                  {map(legendPositions, (name, value) => <option key={value} value={value}>{name}</option>)}
                </select>
              </div>
            </div>
            <div className="col-xs-6">
              <div className="form-group">
                <label htmlFor="legend-position">Legend text alignment</label>
                <div className="btn-group d-flex">
                  <AlignButton legend={opts.legend} updateLegend={this.updateLegend} direction="left" />
                  <AlignButton legend={opts.legend} updateLegend={this.updateLegend} direction="center" />
                  <AlignButton legend={opts.legend} updateLegend={this.updateLegend} direction="right" />
                </div>
              </div>
            </div>
          </div>

          <label><input type="checkbox" checked={opts.tooltip.enabled} onChange={this.toggleTooltip} /> Show tooltip</label>
          <div className="form-group">
            <label htmlFor="tooltip-template">Tooltip template</label>
            <input
              className="form-control"
              id="tooltip-template"
              value={opts.tooltip.template}
              disabled={!opts.tooltip.enabled}
              onChange={this.updateTooltipTemplate}
            />
          </div>

          <label><input type="checkbox" checked={opts.popup.enabled} onChange={this.togglePopup} /> Show popup</label>
          <div className="form-group">
            <label htmlFor="popup-template">Popup template</label>
            <textarea
              className="form-control resize-vertical"
              id="popup-template"
              rows="3"
              value={opts.popup.template}
              disabled={!opts.popup.enabled}
              onChange={this.updatePopupTemplate}
            />
          </div>

          <div className="form-group">
            <Popover trigger="click" placement="top" content={templateHintPopover}>
              <label
                className="ui-sortable-bypass text-muted"
                style={{ fontWeight: 'normal', cursor: 'pointer' }}
              >
                Format specs <i className="fa fa-question-circle m-l-5" />
              </label>
            </Popover>
          </div>
        </div>
      ),
      colors: (
        <div className="m-t-10 m-b-10">
          <div className="row">
            <div className="col-xs-6">
              <div className="form-group">
                <label>Steps</label>
                <input
                  type="number"
                  min="3"
                  max="11"
                  className="form-control"
                  value={opts.steps}
                  onChange={this.updateSteps}
                />
              </div>
            </div>
            <div className="col-xs-6">
              <div className="form-group">
                <label>Clustering mode</label>
                <select
                  value={opts.clusteringMode}
                  className="form-control"
                  onChange={this.updateClusteringMode}
                >
                  {map(clusteringModes, (v, k) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-xs-6">
              <div className="form-group">
                <label>Min color</label>
                <Select
                  value={opts.colors.min}
                  options={map(
                    ChoroplethPalette,
                    (v, k) => ({ label: <span><ColorBox color={v} />{capitalize(k)}</span>, value: v }),
                  )}
                  onChange={this.updateMinColor}
                />
              </div>
            </div>

            <div className="col-xs-6">
              <div className="form-group">
                <label>Max color</label>
                <Select
                  value={opts.colors.max}
                  options={map(
                    ChoroplethPalette,
                    (v, k) => ({ label: <span><ColorBox color={v} />{capitalize(k)}</span>, value: v }),
                  )}
                  onChange={this.updateMaxColor}
                />
              </div>
            </div>

            <div className="col-xs-6">
              <div className="form-group">
                <label>No value color</label>
                <Select
                  value={opts.colors.noValue}
                  options={map(
                    ChoroplethPalette,
                    (v, k) => ({ label: <span><ColorBox color={v} />{capitalize(k)}</span>, value: v }),
                  )}
                  onChange={this.updateNoValueColor}
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-xs-6">
              <div className="form-group">
                <label>Background color</label>
                <Select
                  value={opts.colors.background}
                  options={map(
                    ChoroplethPalette,
                    (v, k) => ({ label: <span><ColorBox color={v} />{capitalize(k)}</span>, value: v }),
                  )}
                  onChange={this.updateBackgroundColor}
                />
              </div>
            </div>

            <div className="col-xs-6">
              <div className="form-group">
                <label>Borders color</label>
                <Select
                  value={opts.colors.borders}
                  options={map(
                    ChoroplethPalette,
                    (v, k) => ({ label: <span><ColorBox color={v} />{capitalize(k)}</span>, value: v }),
                  )}
                  onChange={this.updateBordersColor}
                />
              </div>
            </div>
          </div>
        </div>
      ),
      bounds: (
        <div className="m-t-10 m-b-10">
          <div className="form-group">
            <label>North-East latitude and longitude</label>
            <div className="row">
              <div className="col-xs-6">
                <input
                  className="form-control"
                  type="text"
                  value={opts.bounds[1][0]}
                  onChange={this.updateNorthBounds}
                />
              </div>
              <div className="col-xs-6">
                <input
                  className="form-control"
                  type="text"
                  value={opts.bounds[1][1]}
                  onChange={this.updateEastBounds}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>South-West latitude and longitude</label>
            <div className="row">
              <div className="col-xs-6">
                <input
                  className="form-control"
                  type="text"
                  value={opts.bounds[0][0]}
                  onChange={this.updateSouthBounds}
                />
              </div>
              <div className="col-xs-6">
                <input
                  className="form-control"
                  type="text"
                  value={opts.bounds[0][1]}
                  onChange={this.updateWestBounds}
                />
              </div>
            </div>
          </div>
        </div>
      ),
    };
    return (
      <div>
        <ul className="tab-nav">
          <li className={this.state.currentTab === 'general' ? 'active' : ''}>
            <a data-tabname="general" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>General</a>
          </li>
          <li className={this.state.currentTab === 'colors' ? 'active' : ''}>
            <a data-tabname="colors" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Colors</a>
          </li>
          <li className={this.state.currentTab === 'bounds' ? 'active' : ''}>
            <a data-tabname="bounds" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Bounds</a>
          </li>
        </ul>
        {tabs[this.state.currentTab]}
      </div>
    );
  }
}
