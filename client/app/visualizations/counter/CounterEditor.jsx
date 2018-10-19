import React from 'react';
import PropTypes from 'prop-types';
import { isNumber } from 'lodash';

import { QueryData } from '@/components/proptypes';
import CounterRenderer from './CounterRenderer';

function getRowNumber(index, size) {
  if (index >= 0) {
    return index - 1;
  }

  if (Math.abs(index) > size) {
    index %= size;
  }

  return size + index;
}
export default class CounterEditor extends React.Component {
  static propTypes = {
    data: QueryData.isRequired,
    options: CounterRenderer.Options.isRequired,
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

  updateCounterColName = e => this.props.updateOptions({ counterColName: e.target.value })
  updateRowNumber = e => this.props.updateOptions({ rowNumber: e.target.value })
  updateTargetColName = e => this.props.updateOptions({ targetColName: e.target.value })
  updateTargetRowNumber = e => this.props.updateOptions({ targetRowNumber: e.target.value })
  updateCountRow = e => this.props.updateOptions({ countRow: e.target.checked })
  updateStringDecimal = e => this.props.updateOptions({ stringDecimal: e.target.value })
  updateStringDecChar = e => this.props.updateOptions({ stringDecChar: e.target.value })
  updateStringThouSep = e => this.props.updateOptions({ stringThouSep: e.target.value })
  updateStringPrefix = e => this.props.updateOptions({ stringPrefix: e.target.value })
  updateStringSuffix = e => this.props.updateOptions({ stringSuffix: e.target.value })

  isValueNumber = () => {
    const queryData = this.props.data.rows;
    let counterValue;
    if (queryData) {
      const rowNumber = getRowNumber(this.props.options.rowNumber, queryData.length);
      const counterColName = this.props.options.counterColName;

      if (this.props.options.countRow) {
        counterValue = queryData.length;
      } else if (counterColName) {
        counterValue = queryData[rowNumber][counterColName];
      }
    }
    return isNumber(counterValue);
  }

  render() {
    const opts = this.props.options;
    const tabs = {
      general: (
        <div>
          <div className="form-group">
            <label className="col-lg-6">Counter Value Column Name</label>
            <div className="col-lg-6">
              <select className="form-control" disabled={opts.countRow} value={opts.counterColName} onChange={this.updateCounterColName}>
                {this.props.data.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="col-lg-6">Counter Value Row Number</label>
            <div className="col-lg-6">
              <input
                type="number"
                value={opts.rowNumber}
                className="form-control"
                disabled={opts.countRow}
                onChange={this.updateRowNumber}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="col-lg-6">Target Value Column Name</label>
            <div className="col-lg-6">
              <select className="form-control" value={opts.targetColName} onChange={this.updateTargetColName}>
                <option value="">No target value</option>
                {this.props.data.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          {opts.targetColName ?
            <div className="form-group">
              <label className="col-lg-6">Target Value Row Number</label>
              <div className="col-lg-6">
                <input
                  type="number"
                  value={opts.targetRowNumber}
                  className="form-control"
                  onChange={this.updateTargetRowNumber}
                />
              </div>
            </div> : null}
          <div className="form-group">
            <div className="col-lg-6">
              <input type="checkbox" checked={opts.countRow} onChange={this.updateCountRow} />
              <i className="input-helper" /> Count Rows
            </div>
          </div>
        </div>),
      format: (
        <div ng-show="currentTab == 'format'">
          <div className="form-group">
            <label className="col-lg-6">Formatting Decimal Place</label>
            <div className="col-lg-6">
              <input
                type="number"
                value={opts.stringDecimal}
                className="form-control"
                disabled={!this.isValueNumber()}
                onChange={this.updateStringDecimal}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="col-lg-6">Formatting Decimal Character</label>
            <div className="col-lg-6">
              <input
                type="text"
                ng-model={opts.stringDecChar}
                className="form-control"
                disabled={!this.isValueNumber()}
                onChange={this.updateStringDecChar}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="col-lg-6">Formatting Thousands Separator</label>
            <div className="col-lg-6">
              <input
                type="text"
                value={opts.stringThouSep}
                className="form-control"
                disabled={!this.isValueNumber()}
                onChange={this.updateStringThouSep}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="col-lg-6">Formatting String Prefix</label>
            <div className="col-lg-6">
              <input
                type="text"
                value={opts.stringPrefix}
                className="form-control"
                disabled={!this.isValueNumber()}
                onChange={this.updateStringPrefix}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="col-lg-6">Formatting String Suffix</label>
            <div className="col-lg-6">
              <input
                type="text"
                value={opts.stringSuffix}
                className="form-control"
                disabled={!this.isValueNumber()}
                onChange={this.updateStringSuffix}
              />
            </div>
          </div>
        </div>),
    };
    return (
      <div>
        <ul className="tab-nav">
          <li className={this.state.currentTab === 'general' ? 'active' : ''}>
            <a data-tabname="general" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>General</a>
          </li>
          <li className={this.state.currentTab === 'format' ? 'active' : ''}>
            <a data-tabname="format" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Format</a>
          </li>
        </ul>
        {tabs[this.state.currentTab]}
      </div>
    );
  }
}
