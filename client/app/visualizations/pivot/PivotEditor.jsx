import React from 'react';
import PropTypes from 'prop-types';

import PivotRenderer from './PivotRenderer';

export default class PivotEditor extends React.Component {
  static propTypes = {
    options: PivotRenderer.Options.isRequired,
    updateOptions: PropTypes.func.isRequired,
  }

  updateEnabled = e => this.props.updateOptions({ controls: { enabled: e.target.checked } })

  render() {
    return (
      <div className="form-horizontal">
        <div className="form-group">
          <div className="col-lg-6">
            <label>
              <input
                type="checkbox"
                checked={this.props.options.controls.enabled}
                onChange={this.updateEnabled}
              />
              Hide Pivot Controls
            </label>
          </div>
        </div>
      </div>);
  }
}
