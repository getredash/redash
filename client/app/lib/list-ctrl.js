import { bind } from 'lodash';
import { LivePaginator } from '@/lib/pagination';

export default class ListCtrl {
  constructor($scope, $location, currentUser, defaultOrder = '-created_at') {
    this.searchTerm = $location.search().q || '';

    this.page = parseInt($location.search().page || 1, 10);
    this.pageSize = parseInt($location.search().page_size || 20, 10);
    this.pageSizeOptions = [5, 10, 20, 50, 100];
    this.pageSizeLabel = value => `${value} results`;

    this.orderSeparator = '-';
    this.defaultOrder = defaultOrder;
    this.pageOrder = $location.search().order || this.defaultOrder;
    this.pageOrderReverse = this.pageOrder.startsWith(this.orderSeparator);
    if (this.pageOrderReverse) {
      this.pageOrder = this.pageOrder.substr(1);
    }

    this.defaultOptions = {};

    // use $parent because we're using a component as route target instead of controller;
    // $parent refers to scope created for the page by router
    this.resource = $scope.$parent.$resolve.resource;
    this.currentPage = $scope.$parent.$resolve.currentPage;

    this.currentUser = currentUser;

    this.showEmptyState = false;
    this.loaded = false;

    this.selectedTags = new Set();
    this.onTagsUpdate = (tags) => {
      this.selectedTags = tags;
      this.update();
    };

    this.isInSearchMode = () => this.searchTerm !== undefined && this.searchTerm !== null && this.searchTerm.length > 0;

    const fetcher = (requestedPage, itemsPerPage, orderByField, orderByReverse) => {
      $location.search('page', requestedPage);
      $location.search('page_size', itemsPerPage);

      if (orderByReverse && !orderByField.startsWith(this.orderSeparator)) {
        orderByField = this.orderSeparator + orderByField;
      }
      if (orderByField) {
        $location.search('order', orderByField);
      } else {
        $location.search('order', undefined);
      }

      const request = this.getRequest(requestedPage, itemsPerPage, orderByField);

      if (this.searchTerm === '') {
        this.searchTerm = null;
      }
      $location.search('q', this.searchTerm);

      this.loaded = false;
      const requestCallback = bind(this.processResponse, this);
      return this.resource(request).$promise.then(requestCallback);
    };

    this.paginator = new LivePaginator(fetcher, {
      page: this.page,
      itemsPerPage: this.pageSize,
      orderByField: this.pageOrder,
      orderByReverse: this.pageOrderReverse,
    });

    this.navigateTo = ($event, url) => {
      if ($event.altKey || $event.ctrlKey || $event.metaKey || $event.shiftKey) {
        // keep default browser behavior
        return;
      }
      $event.preventDefault();
      $location.url(url);
    };

    this.update = () => {
      // `queriesFetcher` will be called by paginator
      this.paginator.setPage(this.page, this.pageSize);
    };
  }

  processResponse() {
    this.loaded = true;
  }

  getRequest(requestedPage, itemsPerPage, orderByField) {
    const request = Object.assign({}, this.defaultOptions, {
      page: requestedPage,
      page_size: itemsPerPage,
      order: orderByField,
      tags: [...this.selectedTags], // convert Set to Array
    });
    if (this.isInSearchMode()) {
      request.q = this.searchTerm;
    }
    return request;
  }
}
