import { map, find } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { Filters, FiltersType, filterData } from '@/components/Filters';
import { createPromiseHandler } from '@/lib/utils';
import { registeredVisualizations, VisualizationType } from './index';

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
    filters: [],
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
      this.applyFilters(queryResult.getFilters());
    },
  );

  componentDidUpdate(prevProps) {
    if (this.props.filters !== prevProps.filters) {
      // When global filters changed - apply corresponding values to local filters
      this.applyFilters(this.state.filters, true);
    }
  }

  componentWillUnmount() {
    this.handleQueryResult.cancel();
  }

  applyFilters(filters, applyGlobals = false) {
    // tiny optimization - to avoid unnecessary updates
    if ((this.state.filters.length === 0) && (filters.length === 0)) {
      return;
    }

    if (applyGlobals) {
      filters = map(filters, (localFilter) => {
        const globalFilter = find(this.props.filters, f => f.name === localFilter.name);
        if (globalFilter) {
          return {
            ...localFilter,
            current: globalFilter.current,
          };
        }
        return localFilter;
      });
    }

    this.setState(({ allRows, data }) => ({
      filters,
      data: {
        columns: data.columns,
        rows: filterData(allRows, filters),
      },
    }));
  }

  render() {
    const { visualization, queryResult } = this.props;
    const { data, filters } = this.state;
    const { Renderer, getOptions } = registeredVisualizations[visualization.type];
    const options = getOptions(visualization.options, data);

    this.handleQueryResult(queryResult);

    return (
      <React.Fragment>
        <Filters filters={filters} onChange={newFilters => this.applyFilters(newFilters)} />
        <div>
          <Renderer options={options} data={data} visualizationName={visualization.name} />
        </div>
      </React.Fragment>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('visualizationRenderer', react2angular(VisualizationRenderer));
}

init.init = true;
