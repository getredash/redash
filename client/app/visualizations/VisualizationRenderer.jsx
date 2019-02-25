import { isArray } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { Filters, FiltersType, filterData } from '@/components/Filters';
import { createPromiseHandler } from '@/lib/utils';
import { registeredVisualizations, VisualizationType } from './index';

function chooseFilters(globalFilters, localFilters) {
  return isArray(globalFilters) && (globalFilters.length > 0) ? globalFilters : localFilters;
}

export class VisualizationRenderer extends React.Component {
  static propTypes = {
    visualization: VisualizationType.isRequired,
    queryResult: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    filters: FiltersType,
  };

  static defaultProps = {
    filters: [],
  };

  state = {
    allRows: [], // eslint-disable-line
    data: { columns: [], rows: [] },
    filters: this.props.filters, // use global filters by default, if available
  };

  handleQueryResult = createPromiseHandler(
    queryResult => queryResult.toPromise(),
    () => {
      const { queryResult } = this.props;
      const columns = queryResult ? queryResult.getColumns() : [];
      const rows = queryResult ? queryResult.getData() : [];
      this.setState({
        allRows: rows, // eslint-disable-line
        data: { columns, rows },
      });
      this.applyFilters(
        // If global filters available, use them, otherwise get new local filters from query
        chooseFilters(this.props.filters, queryResult.getFilters()),
      );
    },
  );

  componentDidUpdate(prevProps) {
    if (this.props.filters !== prevProps.filters) {
      // When global filters changed - apply them instead of local
      this.applyFilters(this.props.filters);
    }
  }

  componentWillUnmount() {
    this.handleQueryResult.cancel();
  }

  applyFilters = (filters) => {
    this.setState(({ allRows, data }) => ({
      filters,
      data: {
        columns: data.columns,
        rows: filterData(allRows, filters),
      },
    }));
  };

  render() {
    const { visualization, queryResult } = this.props;
    const { data, filters } = this.state;
    const { Renderer, getOptions } = registeredVisualizations[visualization.type];
    const options = getOptions(visualization.options, data);

    this.handleQueryResult(queryResult);

    return (
      <React.Fragment>
        <Filters filters={filters} onChange={this.applyFilters} />
        <Renderer options={options} data={data} visualizationName={visualization.name} />
      </React.Fragment>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('visualizationRenderer', react2angular(VisualizationRenderer));
}

init.init = true;
