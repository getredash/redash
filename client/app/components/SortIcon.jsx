import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';

export function SortIcon({ column, sortColumn, reverse }) {
  if (column !== sortColumn) {
    return null;
  }

  return (
    <span><i className={'fa fa-sort-' + (reverse ? 'desc' : 'asc')} /></span>
  );
}

SortIcon.propTypes = {
  column: PropTypes.string,
  sortColumn: PropTypes.string,
  reverse: PropTypes.bool,
};

SortIcon.defaultProps = {
  column: null,
  sortColumn: null,
  reverse: false,
};

export default function init(ngModule) {
  ngModule.component('sortIcon', react2angular(SortIcon));
}

init.init = true;
