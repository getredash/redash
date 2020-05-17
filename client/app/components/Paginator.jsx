import React from "react";
import PropTypes from "prop-types";
import Pagination from "antd/lib/pagination";

export default function Paginator({ page, itemsPerPage, totalCount, onChange }) {
  if (totalCount <= itemsPerPage) {
    return null;
  }
  return (
    <div className="paginator-container">
      <Pagination defaultCurrent={page} defaultPageSize={itemsPerPage} total={totalCount} onChange={onChange} />
    </div>
  );
}

Paginator.propTypes = {
  page: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
  onChange: PropTypes.func,
};

Paginator.defaultProps = {
  onChange: () => {},
};
