import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';

import { QueryData } from '@/components/proptypes';
import WordCloudRenderer from './WordCloudRenderer';

export default class WordCloudEditor extends React.Component {
  static propTypes = {
    data: QueryData.isRequired,
    options: WordCloudRenderer.Options.isRequired,
    updateOptions: PropTypes.func.isRequired,
  }

  updateColumn = e => this.props.updateOptions({ column: e.target.value })

  render() {
    return (
      <div className="form-horizontal">
        <div className="form-group">
          <label className="col-lg-6">Word Cloud Column Name</label>
          <div className="col-lg-6">
            <select value={this.props.options.column} className="form-control" onChange={this.updateColumn}>
              <option value="" />
              {map(this.props.data.columns, c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

    );
  }
}

