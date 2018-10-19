import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { QueryData } from '@/components/proptypes';
import { getColumnCleanName } from '@/services/query-result';
import './table-editor.less';
import TableEditorColumns from './TableEditorColumns';
import GridRenderer from './GridRenderer';

const ALLOWED_ITEM_PER_PAGE = [5, 10, 15, 20, 25];


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

  return _.map(columns, (col, index) => ({
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
    date: clientConfig.dateFormat || 'DD/MM/YY',
    datetime: clientConfig.dateTimeFormat || 'DD/MM/YY HH:mm',
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
  queryColumns = _.map(queryColumns, col => col.name);
  visualizationColumns = _.map(visualizationColumns, col => col.name);

  // Some columns may be removed - so skip them (but keep original order)
  visualizationColumns = _.filter(visualizationColumns, col => _.includes(queryColumns, col));
  // Pick query columns that were previously saved with viz (but keep order too)
  queryColumns = _.filter(queryColumns, col => _.includes(visualizationColumns, col));

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
    visualizationColumns = _.fromPairs(_.map(
      visualizationColumns,
      (col, index) => [col.name, _.extend({}, col, { order: index })],
    ));
  } else {
    visualizationColumns = _.fromPairs(_.map(
      visualizationColumns,
      col => [col.name, _.omit(col, 'order')],
    ));
  }
  return _.sortBy(_.map(options, col => ({ ...col, ...visualizationColumns[col.name] })), 'order');
}

function collectTableColumns(data, clientConfig, newCols) {
  return _.map(
    getColumnsOptions(
      data !== null ? data.columns : [],
      newCols,
    ),
    col => _.extend(getDefaultFormatOptions(col, clientConfig), col),
  );
}

export default class GridEditor extends React.Component {
  static propTypes = {
    options: GridRenderer.Options.isRequired,
    updateOptions: PropTypes.func.isRequired,
    data: QueryData.isRequired,
    clientConfig: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'columns',
      columns: null,
    };
  }

  static getDerivedStateFromProps(newProps, oldState) {
    return {
      ...oldState,
      columns: collectTableColumns(newProps.data, newProps.clientConfig, newProps.options.columns),
    };
  }

  showColumnsTab = () => this.setState({ currentTab: 'columns' });
  showGridTab = () => this.setState({ currentTab: 'grid' });

  updateColumns = newCols => (
    this.props.updateOptions({
      columns: collectTableColumns(this.props.data, this.props.clientConfig, newCols),
    }));

  render() {
    const columnsButton = (
      <li className={this.state.currentTab === 'columns' ? 'active' : ''}>
        <a tabIndex={0} role="button" onClick={this.showColumnsTab} onKeyPress={this.showGridTab}>Columns</a>
      </li>
    );
    let activeTab;
    if (this.state.currentTab === 'grid') {
      activeTab = (
        <div className="m-t-10 m-b-10">
          <div className="form-group">
            <label htmlFor="grid-editor-items-per-page">Items per page
              <select id="grid-editor-items-per-page" className="form-control" onChange={e => this.props.updateOptions({ itemsPerPage: e.target.value })}>
                {ALLOWED_ITEM_PER_PAGE.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
        </div>
      );
    } else if (this.state.currentTab === 'columns') {
      activeTab = (
        <TableEditorColumns
          columns={this.state.columns}
          updateColumns={this.updateColumns}
        />
      );
    }

    return (
      <div className="table-editor-container">
        <ul className="tab-nav">
          {this.props.options.globalSeriesType !== 'custom' ? columnsButton : ''}
          <li className={this.state.currentTab === 'grid' ? 'active' : ''}>
            <a tabIndex={0} role="button" onClick={this.showGridTab} onKeyPress={this.showGridTab}>Grid</a>
          </li>
        </ul>
        {activeTab}
      </div>
    );
  }
}
