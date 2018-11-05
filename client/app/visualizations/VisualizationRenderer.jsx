import React from 'react';
import PropTypes from 'prop-types';

import { QueryData, Visualization } from '@/components/proptypes';
import visualizationRegistry from './registry';
import Filters from './Filters';


export default class VisualizationRenderer extends React.Component {
  static propTypes = {
    visualization: Visualization.isRequired,
    setFilters: PropTypes.func.isRequired,
    filters: PropTypes.arrayOf(Filters.Filter),
    data: QueryData.isRequired,
    updateOptions: PropTypes.func.isRequired,
  }

  static defaultProps = {
    filters: [],
  }

  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  componentDidCatch(error) {
    this.setState({ error });
  }

  render() {
    if (!this.props.data.columns.length || !this.props.visualization) return null;
    const Vis = visualizationRegistry[this.props.visualization.type].renderer;
    if (this.state.error) {
      return <div>{`${this.props.visualization.name} visualization rendering failed: ${this.state.error}`}</div>;
    }
    return (
      <React.Fragment>
        <Filters filters={this.props.filters} onChange={this.props.setFilters} />
        <Vis
          filters={this.props.filters}
          options={this.props.visualization.options}
          name={this.props.visualization.name}
          data={this.props.data}
          clientConfig={this.props.clientConfig}
          updateOptions={this.props.updateOptions}
        />
      </React.Fragment>
    );
  }
}
