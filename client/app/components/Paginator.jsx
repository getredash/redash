import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import AntPagination from 'antd/lib/pagination';

export function Pagination({
  page,
  itemsPerPage,
  totalCount,
  onChange,
}) {
  if (totalCount <= itemsPerPage) {
    return null;
  }
  return (
    <div className="paginator-container">
      <AntPagination
        className="pagination"
        defaultCurrent={page}
        defaultPageSize={itemsPerPage}
        total={totalCount}
        onChange={onChange}
      />
    </div>
  );
}

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
  onChange: PropTypes.func,
};

Pagination.defaultProps = {
  onChange: () => {},
};

export default function init(ngModule) {
  ngModule.component('paginator', react2angular(Pagination));
}

init.init = true;
