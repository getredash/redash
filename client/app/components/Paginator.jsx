import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Pagination from 'antd/lib/pagination';

export function Paginator({
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
      <Pagination
        defaultCurrent={page}
        defaultPageSize={itemsPerPage}
        total={totalCount}
        onChange={onChange}
      />
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

export default function init(ngModule) {
  ngModule.component('paginatorImpl', react2angular(Paginator));
  ngModule.component('paginator', {
    template: `
      <paginator-impl
        page="$ctrl.paginator.page"
        items-per-page="$ctrl.paginator.itemsPerPage"
        total-count="$ctrl.paginator.totalCount"
        on-change="$ctrl.onPageChanged"
      ></paginator-impl>`,
    bindings: {
      paginator: '<',
    },
    controller($scope) {
      this.onPageChanged = (page) => {
        this.paginator.setPage(page);
        $scope.$applyAsync();
      };
    },
  });
}

init.init = true;
