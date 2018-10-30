import React from 'react';
import PropTypes from 'prop-types';
import Tabs from 'antd/lib/tabs';

import { QueryData } from '@/components/proptypes';
import CohortRenderer from './CohortRenderer';

export default class CohortEditor extends React.Component {
  static propTypes = {
    data: QueryData.isRequired,
    options: CohortRenderer.Options.isRequired,
    updateOptions: PropTypes.func.isRequired,
  }

  updateDateColumn = e => this.props.updateOptions({ dateColumn: e.target.value });
  updateStageColumn = e => this.props.updateOptions({ stageColumn: e.target.value });
  updateTotalColumn = e => this.props.updateOptions({ totalColumn: e.target.value });
  updateValueColumn = e => this.props.updateOptions({ valueColumn: e.target.value });
  updateTimeInterval = e => this.props.updateOptions({ timeInterval: e.target.value });
  updateMode = e => this.props.updateOptions({ mode: e.target.value });

  render() {
    const columnNames = this.props.data.columns.map(c => c.name);
    columnNames.unshift('');
    return (
      <Tabs defaultActiveKey="columns" animated={false} tabBarGutter={0}>
        <Tabs.TabPane key="columns" tab="Columns">
          <div className="form-group">
            <label className="control-label">Date (Bucket)</label>
            <select
              className="form-control"
              value={this.props.options.dateColumn}
              onChange={this.updateDateColumn}
            >
              {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="control-label">Stage</label>
            <select
              className="form-control"
              value={this.props.options.stageColumn}
              onChange={this.updateStageColumn}
            >
              {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="control-label">Bucket Population Size</label>
            <select
              className="form-control"
              value={this.props.options.totalColumn}
              onChange={this.updateTotalColumn}
            >
              {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="control-label">Stage Value</label>
            <select
              className="form-control"
              value={this.props.options.valueColumn}
              onChange={this.updateValueColumn}
            >
              {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane key="options" tab="Options">
          <div className="form-group">
            <label className="control-label">Time Interval</label>
            <select
              className="form-control"
              value={this.props.options.timeInterval}
              onChange={this.updateTimeInterval}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="form-group">
            <label className="control-label">Mode</label>
            <select
              className="form-control"
              value={this.props.options.mode}
              onChange={this.updateMode}
            >
              <option value="diagonal">Fill gaps with zeros</option>
              <option value="simple">Show data as is</option>
            </select>
          </div>
        </Tabs.TabPane>
      </Tabs>
    );
  }
}
