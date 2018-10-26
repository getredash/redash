import React from 'react';
import PropTypes from 'prop-types';
import Pagination from 'antd/lib/pagination';
import 'antd/lib/pagination/style';
import { extend, findIndex, filter, isFunction, isString, isUndefined, trim } from 'lodash';
import $ from 'jquery';
import renderJsonView from '@/components/dynamic-table/json-cell/json-view-interactive';
import { formatSimpleTemplate } from '@/lib/value-format';

function validateItemsPerPage(value) {
  const defaultValue = 25;
  value = parseInt(value, 10) || defaultValue;
  return value > 0 ? value : defaultValue;
}

const ColumnHeader = (props) => {
  const orderByIdx = findIndex(props.orderBy, ['name', props.column.name]);
  const orderBy = orderByIdx > -1 ? props.orderBy[orderByIdx] : null;
  return (
    <th
      onClick={e => props.onClick(e, props.column)}
      className={`sortable-column content-align-${props.column.alignContent} display-as-${props.column.displayAs}`}
    >
      {props.orderBy.length > 1 && orderBy ? <span className="sort-order-indicator">{orderByIdx + 1}</span> : ''}
      <span>{props.column.title}</span>
      {orderBy ? <i className={`fa fa-caret-${orderBy.direction ? 'up' : 'down'}`} /> : ''}
    </th>
  );
};

const MAX_JSON_SIZE = 50000;

function parseValue(value) {
  if (isString(value) && (value.length <= MAX_JSON_SIZE)) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return undefined;
    }
  }
}

function processTags(str, data, defaultColumn) {
  return formatSimpleTemplate(str, extend({
    '@': data[defaultColumn],
  }, data));
}


function renderValue(column, row) {
  if (column.displayAs === 'image') {
    const url = trim(processTags(column.imageUrlTemplate, row, column.name));
    const width = parseInt(processTags(column.imageWidth, row, column.name), 10);
    const height = parseInt(processTags(column.imageHeight, row, column.name), 10);
    const title = trim(processTags(column.imageTitleTemplate, row, column.name));

    if (url !== '') {
      return (
        <img
          alt=""
          src={url}
          width={isFinite(width) && (width > 0) ? width : null}
          height={isFinite(height) && (height > 0) ? height : null}
          title={title}
        />
      );
    }
    return '';
  } else if (column.displayAs === 'link') {
    const url = trim(processTags(column.linkUrlTemplate, row, column.name));
    const title = trim(processTags(column.linkTitleTemplate, row, column.name));
    const text = trim(processTags(column.linkTextTemplate, row, column.name));

    if (url !== '') {
      return (
        <a
          href={url}
          title={title}
          target={column.linkOpenInNewTab ? '_blank' : null}
        >{text === '' ? url : text}
        </a>
      );
    }
    return '';
  }
  const value = row[column.name];
  if (isFunction(column.formatFunction)) {
    return column.formatFunction(value);
  }
  return value;
}

const TableCell = (props) => {
  if (props.column.displayAs === 'json') {
    const val = props.row[props.column.name];
    const parsedValue = parseValue(val);
    return (
      <td className={`display-as-${props.column.displayAs}`}>
        {isUndefined(parsedValue) ? <div className="json-cell-invalid">{val}</div>
          : <div className="json-cell-valid" ref={el => renderJsonView($(el), parsedValue)} />}
      </td>
    );
  }
  const allowHTML = props.column.displayAs === 'string' && props.column.allowHTML;
  return (
    <td className={`content-align-${props.column.alignContent} display-as-${props.column.displayAs}`}>
      {allowHTML ? <div dangerouslySetInnerHTML={{ __html: renderValue(props.column, props.row) }} />
        : <div>{renderValue(props.column, props.row)}</div>}
    </td>
  );
};

function filterRows(rows, searchTerm, columns) {
  if ((searchTerm === '') || (columns.length === 0) || (rows.length === 0)) {
    return rows;
  }
  searchTerm = searchTerm.toUpperCase();
  return filter(rows, (row) => {
    for (let i = 0; i < columns.length; i += 1) {
      const columnName = columns[i].name;
      const formatFunction = columns[i].formatFunction;
      if (row[columnName] !== undefined) {
        let value = formatFunction ? formatFunction(row[columnName]) : row[columnName];
        value = ('' + value).toUpperCase();
        if (value.indexOf(searchTerm) >= 0) {
          return true;
        }
      }
    }
    return false;
  });
}

function sortRows(rows, orderBy) {
  if ((orderBy.length === 0) || (rows.length === 0)) {
    return rows;
  }
  // Create a copy of array before sorting, because .sort() will modify original array
  return [].concat(rows).sort((a, b) => {
    let va;
    let vb;
    for (let i = 0; i < orderBy.length; i += 1) {
      va = a[orderBy[i].name];
      vb = b[orderBy[i].name];
      if (va < vb) {
        // if a < b - we should return -1, but take in account direction
        return orderBy[i].direction * -1;
      }
      if (va > vb) {
        // if a > b - we should return 1, but take in account direction
        return orderBy[i].direction * 1;
      }
    }
    return 0;
  });
}
const calculateTotalPages = (totalItems, itemsPerPage) => {
  const totalPages = itemsPerPage < 1 ? 1 : Math.ceil(totalItems / itemsPerPage);
  return Math.max(totalPages || 0, 1);
};

function getPages(currentPage, totalPages, maxSize) {
  const pages = [];

  // Default page limits
  let startPage = 1;
  let endPage = totalPages;
  const isMaxSized = maxSize < totalPages;

  // recompute if maxSize
  if (isMaxSized) {
    startPage = (Math.ceil(currentPage / maxSize) - 1) * maxSize + 1;
    endPage = Math.min(startPage + maxSize - 1, totalPages);
  }

  // Add page number links
  for (let number = startPage; number <= endPage; number += 1) {
    pages.push({ number, text: number, active: number === currentPage });
  }

  if (isMaxSized && maxSize > 0) {
    if (startPage > 1) {
      if (startPage > 3) {
        pages.unshift({ number: startPage - 1, text: '...', active: false });
      }
      if (startPage === 3) {
        pages.unshift({ number: 2, text: '2', active: false });
      }
      pages.unshift({ number: 1, text: '1', active: false });
    }
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 2) {
      pages.push({ number: endPage + 1, text: '...', active: false });
    }
    if (endPage === totalPages - 2) {
      pages.push({ number: totalPages - 1, text: totalPages - 1, active: false });
    }
    pages.push({ number: totalPages, text: totalPages, active: false });
  }
  return pages;
}


function displayRows(preparedRows, currentPage, itemsPerPage) {
  const first = (currentPage - 1) * itemsPerPage;
  const last = first + itemsPerPage;
  return preparedRows.slice(first, last);
}

export default class DynamicTable extends React.Component {
  static propTypes = {
    // eslint-disable-next-line react/no-unused-prop-types
    rows: PropTypes.array.isRequired,
    columns: PropTypes.array.isRequired,
    // eslint-disable-next-line react/no-unused-prop-types
    itemsPerPage: PropTypes.number,
  }
  static defaultProps = { itemsPerPage: 10 };

  state = {
    itemsPerPage: 10,
    searchColumns: [],
    preparedRows: [],
    rowsToDisplay: [],
    totalPages: 1,
    currentPage: 1,
    searchTerm: '',
    orderBy: [],
    // eslint-disable-next-line react/no-unused-state
    rows: [],
    columns: [],
  }

  static getDerivedStateFromProps(newProps, oldState) {
    let shouldSortRows = false;
    const newState = { ...oldState };

    if (newProps.columns !== oldState.columns) {
      Object.assign(newState, {
        columns: newProps.columns,
        orderBy: [],
        currentPage: 1,
        searchTerm: '',
        searchColumns: filter(newProps.columns, 'allowSearch'),
      });
      shouldSortRows = true;
    }
    if (newProps.rows !== oldState.rows) {
      newState.rows = newProps.rows;
      newState.currentPage = 1;
      newState.totalPages = calculateTotalPages(newProps.rows.length, newProps.itemsPerPage);
      newState.pages = getPages(1, newState.totalPages, 6);
      shouldSortRows = true;
    }

    if (newProps.itemsPerPage !== oldState.itemsPerPage) {
      newState.itemsPerPage = validateItemsPerPage(newProps.itemsPerPage);
      newState.currentPage = 1;
    }
    if (shouldSortRows) {
      newState.preparedRows = sortRows(
        filterRows(
          newState.rows,
          oldState.searchTerm,
          oldState.searchColumns,
        ),
        newState.orderBy,
      );
    }
    newState.rowsToDisplay = displayRows(newState.preparedRows, newState.currentPage, newState.itemsPerPage);
    return newState;
  }

  selectPage = (pageNumber) => {
    if (pageNumber !== this.state.currentPage && pageNumber > 0 && pageNumber <= this.state.totalPages) {
      this.setState({
        currentPage: pageNumber,
        // pages: getPages(pageNumber, this.state.totalPages, 6),
        rowsToDisplay: displayRows(this.state.preparedRows, pageNumber, this.state.itemsPerPage),
      });
    }
  }

  render() {
    return (
      <React.Fragment>
        <div className="dynamic-table-container">
          <table className="table table-condensed table-hover">
            <thead>
              <tr>
                {this.props.columns.map(c => (
                  <ColumnHeader
                    key={c.name}
                    column={c}
                    orderBy={this.state.orderBy}
                    onClick={this.onColumnHeaderClick}
                  />
                ))}
                <th className="dynamic-table-spacer" />
              </tr>
            </thead>
            {this.state.searchColumns.length > 0 ?
              <thead>
                <th className="p-t-10 p-b-10 p-l-15 p-r-15" colSpan={this.props.columns.length + 1}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search..."
                    value={this.state.searchTerm}
                    onChange={this.onSearchTermChanged}
                  />
                </th>
              </thead> : <thead />}
            <tbody>
              {this.state.rowsToDisplay.map((r, i) => (
                /* eslint-disable-next-line react/no-array-index-key */
                <tr key={i}>
                  {this.state.columns.map(c => <TableCell key={c.name} column={c} row={r} />)}
                </tr>
               ))}
            </tbody>
          </table>
        </div>
        {this.state.preparedRows.length > this.state.itemsPerPage ?
          <div className="paginator-container">
            <Pagination
              current={this.state.currentPage}
              pageSize={this.state.itemsPerPage}
              total={this.state.totalPages}
              onChange={this.selectPage}
            />
          </div>
          : ''}
      </React.Fragment>
    );
  }
}
