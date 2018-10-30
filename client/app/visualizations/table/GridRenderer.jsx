import React from 'react';
import PropTypes from 'prop-types';
import { extend, filter, fromPairs, includes, map, omit, sortBy } from 'lodash';

import { ColumnDetail, QueryData } from '@/components/proptypes';
import { createFormatter } from '@/lib/value-format';
import { getColumnCleanName } from '@/services/query-result';
import DynamicTable from './DynamicTable';

function getColumnContentAlignment(type) {
  return ['integer', 'float', 'boolean', 'date', 'datetime'].indexOf(type) >= 0 ? 'right' : 'left';
}

function getDefaultColumnsOptions(columns) {
  const displayAs = {
    integer: 'number',
    float: 'number',
    boolean: 'boolean',
    date: 'datetime',
    datetime: 'datetime',
  };

  return map(columns, (col, index) => ({
    name: col.name,
    type: col.type,
    displayAs: displayAs[col.type] || 'string',
    visible: true,
    order: 100000 + index,
    title: getColumnCleanName(col.name),
    allowSearch: false,
    alignContent: getColumnContentAlignment(col.type),
    // `string` cell options
    allowHTML: true,
    highlightLinks: false,
  }));
}

function getDefaultFormatOptions(column, clientConfig) {
  const dateTimeFormat = {
    date: clientConfig.dateFormat || 'DD/MM/YYYY',
    datetime: clientConfig.dateTimeFormat || 'DD/MM/YYYY HH:mm',
  };
  const numberFormat = {
    integer: clientConfig.integerFormat || '0,0',
    float: clientConfig.floatFormat || '0,0.00',
  };
  return {
    dateTimeFormat: dateTimeFormat[column.type],
    numberFormat: numberFormat[column.type],
    booleanValues: clientConfig.booleanValues || ['false', 'true'],
    // `image` cell options
    imageUrlTemplate: '{{ @ }}',
    imageTitleTemplate: '{{ @ }}',
    imageWidth: '',
    imageHeight: '',
    // `link` cell options
    linkUrlTemplate: '{{ @ }}',
    linkTextTemplate: '{{ @ }}',
    linkTitleTemplate: '{{ @ }}',
    linkOpenInNewTab: true,
  };
}

function wereColumnsReordered(queryColumns, visualizationColumns) {
  queryColumns = map(queryColumns, col => col.name);
  visualizationColumns = map(visualizationColumns, col => col.name);

  // Some columns may be removed - so skip them (but keep original order)
  visualizationColumns = filter(visualizationColumns, col => includes(queryColumns, col));
  // Pick query columns that were previously saved with viz (but keep order too)
  queryColumns = filter(queryColumns, col => includes(visualizationColumns, col));

  // Both array now have the same size as they both contains only common columns
  // (in fact, it was an intersection, that kept order of items on both arrays).
  // Now check for equality item-by-item; if common columns are in the same order -
  // they were not reordered in editor
  for (let i = 0; i < queryColumns.length; i += 1) {
    if (visualizationColumns[i] !== queryColumns[i]) {
      return true;
    }
  }
  return false;
}

function getColumnsOptions(columns, visualizationColumns) {
  const options = getDefaultColumnsOptions(columns);

  if ((wereColumnsReordered(columns, visualizationColumns))) {
    visualizationColumns = fromPairs(map(
      visualizationColumns,
      (col, index) => [col.name, { ...col, order: index }],
    ));
  } else {
    visualizationColumns = fromPairs(map(
      visualizationColumns,
      col => [col.name, omit(col, 'order')],
    ));
  }
  return sortBy(map(options, col => ({ ...col, ...visualizationColumns[col.name] })), 'order');
}

function getColumnsToDisplay(columns, options, clientConfig) {
  columns = fromPairs(map(columns, col => [col.name, col]));
  let result = map(options, col => extend(
    getDefaultFormatOptions(col, clientConfig),
    col,
    columns[col.name],
  ));

  result = map(result, col => ({
    ...col,
    formatFunction: createFormatter(col),
  }));

  return sortBy(filter(result, 'visible'), 'order');
}

const GridOptions = PropTypes.shape({
  columns: PropTypes.arrayOf(ColumnDetail),
  itemsPerPage: PropTypes.number,
});

export default class GridRenderer extends React.Component {
  static Options = GridOptions

  static DEFAULT_OPTIONS = {
    itemsPerPage: 25,
    autoHeight: true,
    defaultRows: 14,
    defaultColumns: 3,
    minColumns: 2,
  }

  static propTypes = {
    options: GridOptions,
    data: QueryData.isRequired,
  }

  static defaultProps = {
    options: {},
  };

  render() {
    const columns = this.props.data.columns;
    const columnsOptions = getColumnsOptions(columns, this.props.options.columns);
    const gridColumns = getColumnsToDisplay(columns, columnsOptions, this.props.clientConfig);

    return (
      <DynamicTable
        rows={this.props.data.rows}
        columns={gridColumns}
        itemsPerPage={this.props.options.itemsPerPage}
      />
    );
  }
}
