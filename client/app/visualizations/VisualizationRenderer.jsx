import { map, find } from 'lodash';
import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import useQueryResult from '@/lib/hooks/useQueryResult';
import { Filters, FiltersType, filterData } from '@/components/Filters';
import { registeredVisualizations, VisualizationType } from './index';

function combineFilters(localFilters, globalFilters) {
  // tiny optimization - to avoid unnecessary updates
  if ((localFilters.length === 0) || (globalFilters.length === 0)) {
    return localFilters;
  }

  return map(localFilters, (localFilter) => {
    const globalFilter = find(globalFilters, f => f.name === localFilter.name);
    if (globalFilter) {
      return {
        ...localFilter,
        current: globalFilter.current,
      };
    }
    return localFilter;
  });
}

export function VisualizationRenderer(props) {
  const data = useQueryResult(props.queryResult);
  const [filters, setFilters] = useState(data.filters);

  // Reset local filters when query results updated
  useEffect(() => {
    setFilters(combineFilters(data.filters, props.filters));
  }, [data]);

  // Update local filters when global filters changed
  useEffect(() => {
    setFilters(combineFilters(filters, props.filters));
  }, [props.filters]);

  const filteredData = useMemo(() => ({
    columns: data.columns,
    rows: filterData(data.rows, filters),
  }), [data, filters]);

  const { showFilters, visualization } = props;
  const { Renderer, getOptions } = registeredVisualizations[visualization.type];
  const options = getOptions(visualization.options, data);

  return (
    <React.Fragment>
      {showFilters && <Filters filters={filters} onChange={setFilters} />}
      <div>
        <Renderer options={options} data={filteredData} visualizationName={visualization.name} />
      </div>
    </React.Fragment>
  );
}

VisualizationRenderer.propTypes = {
  visualization: VisualizationType.isRequired,
  queryResult: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  filters: FiltersType,
  showFilters: PropTypes.bool,
};

VisualizationRenderer.defaultProps = {
  filters: [],
  showFilters: true,
};

export default function init(ngModule) {
  ngModule.component('visualizationRenderer', react2angular(VisualizationRenderer));
}

init.init = true;
