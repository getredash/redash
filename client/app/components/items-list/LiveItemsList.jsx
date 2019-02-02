import { bind, extend } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import LivePaginator from '@/lib/pagination/live-paginator';
import { $location, $route } from '@/services/ng';
import { clientConfig } from '@/services/auth';
import ItemsListContext from './ItemsListContext';

export const ORDER_SEPARATOR = '-';

export const DEFAULT_ORDER = '-created_at';

export default class LiveItemsList extends React.Component {
  static propTypes = {
    children: PropTypes.oneOfType([
      PropTypes.node,
      PropTypes.arrayOf(PropTypes.node),
    ]),
    getRequest: PropTypes.func,
    doRequest: PropTypes.func.isRequired,
  };

  static defaultProps = {
    children: null,
    getRequest: request => request,
  };

  constructor(props) {
    super(props);

    const urlQueryParams = $location.search();

    let pageOrder = urlQueryParams.order || DEFAULT_ORDER;
    const pageOrderReverse = pageOrder.startsWith(ORDER_SEPARATOR);
    if (pageOrderReverse) {
      pageOrder = pageOrder.substr(1);
    }

    this.isLoaded = false;
    this.isEmpty = false;

    this.searchTerm = urlQueryParams.q || '';
    this.selectedTags = [];

    this.paginator = new LivePaginator(
      bind(this.fetchData, this),
      {
        page: parseInt(urlQueryParams.page, 10) || 1,
        itemsPerPage: parseInt(urlQueryParams.page_size, 10) || clientConfig.pageSize,
        orderByField: pageOrder,
        orderByReverse: pageOrderReverse,
      },
      false,
    );

    this.state = {
      context: this.getContextData(),
    };

    this.updatePaginator = (updates) => {
      updates = extend({ page: this.paginator.page }, updates);
      this.paginator.setPage(
        updates.page,
        updates.pageSize,
        updates.pageOrder,
        updates.pageOrderReverse,
      );
    };

    this.updateSearch = (searchTerm) => {
      this.searchTerm = searchTerm;
      this.paginator.fetchPage();
    };

    this.updateSelectedTags = (selectedTags) => {
      this.selectedTags = selectedTags;
      this.paginator.fetchPage();
    };

    this.toggleSorting = (orderByField) => {
      this.paginator.orderBy(orderByField);
    };

    this.update = () => {
      this.paginator.fetchPage();
    };
  }

  componentDidMount() {
    this.paginator.fetchPage();
  }

  getContextData() {
    const {
      isLoaded,
      searchTerm,
      selectedTags,
      paginator,
      updatePaginator,
      updateSearch,
      updateSelectedTags,
      toggleSorting,
      update,
    } = this;

    return {
      title: $route.current.title,

      isLoaded,
      isEmpty: paginator.totalCount === 0,

      searchTerm,
      selectedTags,

      page: paginator.page,
      itemsPerPage: paginator.itemsPerPage,
      orderByField: paginator.orderByField,
      orderByReverse: paginator.orderByReverse,
      totalItemsCount: paginator.totalCount,
      items: paginator.getPageRows(),

      updatePaginator,
      updateSearch,
      updateSelectedTags,
      toggleSorting,
      update,
    };
  }

  getRequest(requestedPage, itemsPerPage, orderByField) {
    return {
      page: requestedPage,
      page_size: itemsPerPage,
      order: orderByField,
      q: this.searchTerm !== '' ? this.searchTerm : undefined,
      tags: this.selectedTags,
    };
  }

  fetchData(requestedPage, itemsPerPage, orderByField, orderByReverse, paginator, requested = false) {
    // in search mode ignore the ordering and use the ranking order
    // provided by the server-side FTS backend instead, unless it was
    // requested by the user by actively ordering in search mode
    if (this.isInSearchMode && !requested) {
      orderByField = undefined;
    }
    if (orderByField && orderByReverse) {
      orderByField = ORDER_SEPARATOR + orderByField;
    }

    $location.search({
      page: requestedPage,
      page_size: itemsPerPage,
      order: orderByField,
      q: this.searchTerm !== '' ? this.searchTerm : null,
    });

    this.isLoaded = false;
    this.isEmpty = false;
    this.setState({ context: this.getContextData() });

    const request = this.props.getRequest(
      this.getRequest(requestedPage, itemsPerPage, orderByField),
    );
    return this.props.doRequest(request).then((data) => {
      this.paginator.updateRows(data.results, data.count);
      this.isLoaded = true;
      this.setState({ context: this.getContextData() });
    });
  }

  render() {
    return (
      <ItemsListContext.Provider value={this.state.context}>{this.props.children}</ItemsListContext.Provider>
    );
  }
}
