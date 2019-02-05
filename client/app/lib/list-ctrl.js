import { bind, each } from 'lodash';
import $ from 'jquery';
import { LivePaginator } from '@/lib/pagination';
import { Query } from '@/services/query';
import { Dashboard } from '@/services/dashboard';
import { User } from '@/services/user';

export function buildListRoutes(name, routes, template) {
  const listRoutes = {};
  each(routes, (route) => {
    listRoutes[route.path] = {
      template,
      reloadOnSearch: false,
      title: route.title,
      resolve: {
        currentPage: () => route.page,
        resource: () => {
          // services that are using the ListCtrl class
          const listServices = {
            query: Query,
            dashboard: Dashboard,
            user: User,
          };
          return listServices[name].query.bind(listServices[name]);
        },
      },
    };
  });
  return listRoutes;
}

export class ListCtrl {
  constructor($scope, $location, $route, currentUser, clientConfig, defaultOrder = '-created_at') {
    this.title = $route.current.title; // will make it available as $ctrl.title
    this.searchTerm = $location.search().q || '';

    this.page = parseInt($location.search().page || 1, 10);
    this.pageSize = parseInt($location.search().page_size || clientConfig.pageSize, 10);
    this.pageSizeOptions = clientConfig.pageSizeOptions;
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
      $scope.$applyAsync();
    };

    this.isInSearchMode = () => this.searchTerm !== undefined && this.searchTerm !== null && this.searchTerm.length > 0;

    const fetcher = (requestedPage, itemsPerPage, orderByField, orderByReverse, paginator, requested = false) => {
      $location.search('page', requestedPage);
      $location.search('page_size', itemsPerPage);
      const order = this.getOrder(orderByField, orderByReverse, requested, paginator);
      $location.search('order', order);
      const request = this.getRequest(requestedPage, itemsPerPage, order);

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
      // angular handles events before `react2angular` passes them to wrapped components
      if ($($event.target).parents('favorites-control').length > 0) {
        return;
      }
      if ($event.altKey || $event.ctrlKey || $event.metaKey || $event.shiftKey) {
        // keep default browser behavior
        return;
      }
      $event.preventDefault();
      $location.url(url);
    };

    this.update = () => {
      this.paginator.setPage(
        this.page,
        this.pageSize,
        this.pageOrder,
        this.pageOrderReverse,
      );
    };
  }

  processResponse() {
    this.loaded = true;
  }

  getOrder(orderByField, orderByReverse, requested, paginator) {
    // in search mode ignore the ordering and use the ranking order
    // provided by the server-side FTS backend instead, unless it was
    // requested by the user by actively ordering in search mode
    if (this.isInSearchMode() && !requested) {
      orderByField = undefined;
    } else {
      this.pageOrder = orderByField;
      this.pageOrderReverse = orderByReverse;
    }
    // pass the current ordering state to the paginator
    // so the sort icons work correctly
    paginator.orderByField = orderByField;
    paginator.orderByReverse = orderByReverse;
    // combine the ordering field and direction in one query parameter
    if (orderByField && orderByReverse && !orderByField.startsWith(this.orderSeparator)) {
      orderByField = this.orderSeparator + orderByField;
    }
    return orderByField;
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
