import React from 'react';
import PropTypes from 'prop-types';
import { capitalize, map } from 'lodash';
import Select from 'react-select';

import visualizationRegistry from '@/visualizations/registry';
import VisualizationRenderer from './VisualizationRenderer';

export default class VisualizationOptionsEditor extends React.Component {
  static propTypes = {
    // eslint-disable-next-line react/no-unused-prop-types
    visualization: PropTypes.object.isRequired,
    updateVisualization: PropTypes.func.isRequired,
    data: PropTypes.object.isRequired,
    setFilters: PropTypes.func.isRequired,
    filters: PropTypes.array.isRequired,

  }

  updateType = t => this.props.updateVisualization({
    ...this.props.visualization,
    type: t.value,
    name: this.props.visualization.name === visualizationRegistry[this.props.visualization.type].name ?
      visualizationRegistry[t.value].name :
      this.props.visualization.name,
    options: t.value !== this.props.visualization.type ?
      visualizationRegistry[t.value].defaultOptions :
      this.props.visualization.options,
  })

  updateName = e => this.props.updateVisualization({ ...this.props.visualization, name: e.target.value })
  updateOptions = newOptions => this.props.updateVisualization({
    ...this.props.visualization,
    options: {
      ...this.props.visualization.options,
      ...newOptions,
    },
  })

  render() {
    const Editor = visualizationRegistry[this.props.visualization.type].editor;
    return (
      <React.Fragment>
        <div className="col-md-5 p-r-10 p-l-0">
          <div className="form-group">
            <label className="control-label">Visualization Type</label>
            <Select
              value={this.props.visualization.type}
              disabled={this.props.visualization && !!this.props.visualization.id}
              options={map(visualizationRegistry, (v, t) => ({ label: v.name, value: t, vis: v }))}
              onChange={this.updateType}
              clearable={false}
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label className="control-label">Visualization Name</label>
            <input
              name="name"
              type="text"
              className="form-control"
              value={this.props.visualization.name}
              placeholder={capitalize(this.props.visualization.type)}
              onChange={this.updateName}
            />
          </div>
          <Editor
            options={this.props.visualization.options}
            updateOptions={this.updateOptions}
            data={this.props.data}
            clientConfig={this.props.clientConfig}
          />
        </div>
        <div className="col-md-7 p-0 visualization-editor__right">
          <VisualizationRenderer
            filters={this.props.filters}
            setFilters={this.props.setFilters}
            data={this.props.data}
            visualization={this.props.visualization}
            updateOptions={this.updateOptions}
            clientConfig={this.props.clientConfig}
          />
        </div>
      </React.Fragment>
    );
  }
}
