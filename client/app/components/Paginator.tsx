import React from "react";
import Pagination from "antd/lib/pagination";

const MIN_ITEMS_PER_PAGE = 5;

type OwnProps = {
    page: number;
    showPageSizeSelect?: boolean;
    pageSize: number;
    totalCount: number;
    onPageSizeChange?: (...args: any[]) => any;
    onChange?: (...args: any[]) => any;
};

type Props = OwnProps & typeof Paginator.defaultProps;

export default function Paginator({ page, showPageSizeSelect, pageSize, onPageSizeChange, totalCount, onChange }: Props) {
  if (totalCount <= (showPageSizeSelect ? MIN_ITEMS_PER_PAGE : pageSize)) {
    return null;
  }
  return (
    <div className="paginator-container">
      <Pagination
        showSizeChanger={showPageSizeSelect}
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

Paginator.defaultProps = {
  showPageSizeSelect: false,
  onChange: () => {},
  onPageSizeChange: () => {},
};
