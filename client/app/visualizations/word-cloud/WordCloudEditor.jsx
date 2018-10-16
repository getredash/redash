import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';

export default class WordCloudEditor extends React.Component {
  static propTypes = {
    data: PropTypes.object.isRequired,
    visualization: PropTypes.object.isRequired,
    updateVisualization: PropTypes.func.isRequired,
  }

  updateColumn = e => this.props.updateVisualization({
    ...this.props.visualization,
    options: {
      ...this.props.visualization.options,
      column: e.target.value,
    },
  })

  render() {
    return (
      <div className="form-horizontal">
        <div className="form-group">
          <label className="col-lg-6">Word Cloud Column Name</label>
          <div className="col-lg-6">
            <select value={this.props.visualization.options.column} className="form-control" onChange={this.updateColumn}>
              <option value="" />
              {map(this.props.data.columns, c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

    );
  }
}

