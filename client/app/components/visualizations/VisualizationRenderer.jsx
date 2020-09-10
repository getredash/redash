import { map, find } from "lodash";
import React, { useState, useMemo, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import useQueryResultData from "@/lib/useQueryResultData";
import Filters, { FiltersType, filterData } from "@/components/Filters";
import { VisualizationType } from "@redash/viz/lib";
import { Renderer } from "@/components/visualizations/visualizationComponents";

function combineFilters(localFilters, globalFilters) {
  // tiny optimization - to avoid unnecessary updates
  if (localFilters.length === 0 || globalFilters.length === 0) {
    return localFilters;
  }

  return map(localFilters, localFilter => {
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

export default function VisualizationRenderer(props) {
  const data = useQueryResultData(props.queryResult);
  const [filters, setFilters] = useState(data.filters);
  const filtersRef = useRef();
  filtersRef.current = filters;

  // Reset local filters when query results updated
  useEffect(() => {
    setFilters(combineFilters(data.filters, props.filters));
  }, [data.filters, props.filters]);

  // Update local filters when global filters changed.
  // For correct behavior need to watch only `props.filters` here,
  // therefore using ref to access current local filters
  useEffect(() => {
    setFilters(combineFilters(filtersRef.current, props.filters));
  }, [props.filters]);

  const filteredData = useMemo(
    () => ({
      columns: data.columns,
      rows: filterData(data.rows, filters),
    }),
    [data, filters]
  );

  const { showFilters, visualization, onSuccess } = props;

  let options = { ...visualization.options };

  // define pagination size based on context for Table visualization
  if (visualization.type === "TABLE") {
    options.paginationSize = props.context === "widget" ? "small" : "default";
  }

  return (
    <Renderer
      key={`visualization${visualization.id}`}
      type={visualization.type}
      options={options}
      data={filteredData}
      visualizationName={visualization.name}
      visualization={visualization}
      onSuccess={onSuccess}
      addonBefore={showFilters && <Filters filters={filters} onChange={setFilters} />}
    />
  );
}

VisualizationRenderer.propTypes = {
  visualization: VisualizationType.isRequired,
  queryResult: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  filters: FiltersType,
  showFilters: PropTypes.bool,
  context: PropTypes.oneOf(["query", "widget"]).isRequired,
};

VisualizationRenderer.defaultProps = {
  filters: [],
  showFilters: true,
};
