import React from "react";
import PropTypes from "prop-types";
import Pagination from "antd/lib/pagination";

import "./Paginator.less";

const MIN_ITEMS_PER_PAGE = 5;

export default function Paginator({ page, showPageSizeSelect, pageSize, onPageSizeChange, totalCount, onChange }) {
  if (totalCount <= (showPageSizeSelect ? MIN_ITEMS_PER_PAGE : pageSize)) {
    return null;
  }
  return (
    <div className="paginator-container">
      <Pagination
        showSizeChanger={false}
        pageSizeOptions={["5", "10", "20", "50", "100"]}
        onShowSizeChange={(_, size) => onPageSizeChange(size)}
        defaultCurrent={page}
        pageSize={pageSize}
        total={totalCount}
        onChange={onChange}
      />
    </div>
  );
}

Paginator.propTypes = {
  page: PropTypes.number.isRequired,
  showPageSizeSelect: PropTypes.bool,
  pageSize: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
  onPageSizeChange: PropTypes.func,
  onChange: PropTypes.func,
};

Paginator.defaultProps = {
  showPageSizeSelect: false,
  onChange: () => {},
  onPageSizeChange: () => {},
};
