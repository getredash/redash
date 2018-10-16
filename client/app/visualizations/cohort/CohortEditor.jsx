import React from 'react';
import PropTypes from 'prop-types';

export default class CohortEditor extends React.Component {
  static propTypes = {
    data: PropTypes.object.isRequired,
    visualization: PropTypes.object.isRequired,
    updateVisualization: PropTypes.func.isRequired,
  }
  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'columns',
    };
  }

  changeTab = (event) => {
    this.setState({ currentTab: event.target.dataset.tabname });
  }

  updateOptions = changes => this.props.updateVisualization({
    ...this.props.visualization,
    options: { ...this.props.visualization.options, ...changes },
  })

  updateDateColumn = e => this.updateOptions({ dateColumn: e.target.value });
  updateStageColumn = e => this.updateOptions({ stageColumn: e.target.value });
  updateTotalColumn = e => this.updateOptions({ totalColumn: e.target.value });
  updateValueColumn = e => this.updateOptions({ valueColumn: e.target.value });
  updateTimeInterval = e => this.updateOptions({ timeInterval: e.target.value });
  updateMode = e => this.updateOptions({ mode: e.target.value });

  render() {
    const columnNames = this.props.data.columns.map(c => c.name);
    columnNames.unshift('');
    const tabs = {
      columns: (
        <div className="m-t-10 m-b-10">
          <div className="form-group">
            <label className="control-label">Date (Bucket)</label>
            <select
              className="form-control"
              value={this.props.visualization.options.dateColumn}
              onChange={this.updateDateColumn}
            >
              {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="control-label">Stage</label>
            <select
              className="form-control"
              value={this.props.visualization.options.stageColumn}
              onChange={this.updateStageColumn}
            >
              {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="control-label">Bucket Population Size</label>
            <select
              className="form-control"
              value={this.props.visualization.options.totalColumn}
              onChange={this.updateTotalColumn}
            >
              {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="control-label">Stage Value</label>
            <select
              className="form-control"
              value={this.props.visualization.options.valueColumn}
              onChange={this.updateValueColumn}
            >
              {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      ),
      options: (
        <div className="m-t-10 m-b-10">
          <div className="form-group">
            <label className="control-label">Time Interval</label>
            <select
              className="form-control"
              value={this.props.visualization.options.timeInterval}
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
              value={this.props.visualization.options.mode}
              onChange={this.updateMode}
            >
              <option value="diagonal">Fill gaps with zeros</option>
              <option value="simple">Show data as is</option>
            </select>
          </div>
        </div>
      ),
    };
    return (
      <div>
        <ul className="tab-nav">
          <li className={this.state.currentTab === 'columns' ? 'active' : ''}>
            <a data-tabname="columns" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Columns</a>
          </li>
          <li className={this.state.currentTab === 'options' ? 'active' : ''}>
            <a data-tabname="options" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Options</a>
          </li>
        </ul>
        {tabs[this.state.currentTab]}
      </div>
    );
  }
}
