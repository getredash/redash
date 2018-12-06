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

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.props.data.columns.length || !this.props.visualization) return null;
    const Vis = visualizationRegistry[this.props.visualization.type].renderer;
    if (this.state.error) {
      let errMsg;
      try {
        errMsg = Vis.getError();
      } catch (p) {
        errMsg = this.state.error.message;
      }
      return <div>{`${this.props.visualization.name} visualization rendering failed: `}{errMsg}</div>;
    }
    return (
      <React.Fragment>
        {/* eslint-disable-next-line react/prop-types */}
        <Filters filters={this.props.filters} onChange={this.props.setFilters} clientConfig={this.props.clientConfig} />
        <Vis
          filters={this.props.filters}
          options={this.props.visualization.options}
          name={this.props.visualization.name}
          data={this.props.data}
          clientConfig={
            /* Can't include this in propTypes now since that will prevent react2angular from injecting it */
            /* eslint-disable-next-line react/prop-types */
            this.props.clientConfig}
          updateOptions={this.props.updateOptions}
        />
      </React.Fragment>
    );
  }
}
