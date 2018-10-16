import React from 'react';
import PropTypes from 'prop-types';

export default class FunnelEditor extends React.Component {
  static propTypes = {
    data: PropTypes.object.isRequired,
    visualization: PropTypes.object.isRequired,
    updateVisualization: PropTypes.func.isRequired,
  }

  updateOptions = changes => this.props.updateVisualization({
    ...this.props.visualization,
    options: { ...this.props.visualization.options, ...changes },
  })

  updateStepColName = e => this.updateOptions({
    stepCol: { ...this.props.visualization.options.stepCol, colName: e.target.value },
  })
  updateStepColDisplayAs = e => this.updateOptions({
    stepCol: { ...this.props.visualization.options.stepCol, displayAs: e.target.value },
  })
  updateValueColName = e => this.updateOptions({
    valueCol: { ...this.props.visualization.options.valueCol, colName: e.target.value },
  })
  updateValueColDisplayAs = e => this.updateOptions({
    valueCol: { ...this.props.visualization.options.valueCol, displayAs: e.target.value },
  })
  updateSortKeyColName = e => this.updateOptions({
    sortKeyCol: { ...this.props.visualization.options.sortKey, colName: e.target.value },
  })
  updateAutoSort = e => this.updateOptions({ autoSort: e.target.checked })

  render() {
    const columnNames = this.props.data.columns.map(c => c.name);
    columnNames.unshift('');
    const opts = this.props.visualization.options;
    return (
      <div className="form-horizontal">
        <div style={{ marginBottom: 20 }}>
          This visualization constructs funnel chart. Please notice that value column only accept number for values.
        </div>
        <div className="form-group">
          <label className="col-lg-6">Step Column Name</label>
          <div className="col-lg-6">
            <select
              className="form-control"
              value={opts.stepCol.colName}
              onChange={this.updateStepColName}
            >
              {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="col-lg-6">Step Column Display Name</label>
          <div className="col-lg-6">
            <input
              type="text"
              value={opts.stepCol.displayAs}
              className="form-control"
              onChange={this.updateStepColDisplayAs}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="col-lg-6">Funnel Value Column Name</label>
          <div className="col-lg-6">
            <select value={opts.valueCol.colName} className="form-control" onChange={this.updateValueColName}>
              {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="col-lg-6">Funnel Value Column Display Name</label>
          <div className="col-lg-6">
            <input
              type="text"
              value={opts.valueCol.displayAs}
              className="form-control"
              onChange={this.updateValueColDisplayAs}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="col-lg-6">Auto Sort Record By Value</label>
          <div className="col-lg-6">
            <input type="checkbox" checked={opts.autoSort} onChange={this.updateAutoSort} />
          </div>
        </div>
        {!opts.autoSort ?
          <div className="form-group">
            <label className="col-lg-6">Funnel Sort Key Column Name</label>
            <div className="col-lg-6">
              <select value={opts.sortKeyCol.colName} className="form-control" onChange={this.updateSortKeyColName}>
                {columnNames.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div> : null}
      </div>);
  }
}
