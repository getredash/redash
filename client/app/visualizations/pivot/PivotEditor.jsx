import React from 'react';
import PropTypes from 'prop-types';

export default class PivotEditor extends React.Component {
  static propTypes = {
    visualization: PropTypes.object.isRequired,
  }

  updateOptions = changes => this.props.updateVisualization({
    ...this.props.visualization,
    options: { ...this.props.visualization.options, ...changes },
  })

  updateEnabled = e => this.updateOptions({ controls: { enabled: e.target.checked } })

  render() {
    return (
      <div className="form-horizontal">
        <div className="form-group">
          <div className="col-lg-6">
            <label>
              <input
                type="checkbox"
                checked={this.props.visualization.options.controls.enabled}
                onChange={this.updateEnabled}
              />
              Hide Pivot Controls
            </label>
          </div>
        </div>
      </div>);
  }
}
