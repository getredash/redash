import { isFunction, isString, isNil, extend, defaultTo, wrap, identity, noop } from 'lodash';
import LivePaginator from '@/lib/pagination/live-paginator';
import { $location, $route } from '@/services/ng';
import { clientConfig } from '@/services/auth';

export const ORDER_SEPARATOR = '-';

export const DEFAULT_ORDER = '-created_at';

function prepareOrderByField(orderByField, orderByReverse) {
  if (isNil(orderByField)) {
    return null;
  }
  return orderByReverse ? ORDER_SEPARATOR + orderByField : orderByField;
}

export default class LiveItemsList {
  // eslint-disable-next-line class-methods-use-this
  getParamsFromUrl() {
    const urlQueryParams = $location.search();

    let orderByField = urlQueryParams.order || DEFAULT_ORDER;
    const orderByReverse = orderByField.startsWith(ORDER_SEPARATOR);
    if (orderByReverse) {
      orderByField = orderByField.substr(1);
    }

    return {
      page: parseInt(urlQueryParams.page, 10) || 1,
      itemsPerPage: parseInt(urlQueryParams.page_size, 10) || clientConfig.pageSize,
      orderByField,
      orderByReverse,
      searchTerm: urlQueryParams.q || '',
    };
  }

  updateUrlParams() {
    $location.search({
      page: this.state.page,
      page_size: this.state.itemsPerPage,
      order: prepareOrderByField(this.state.orderByField, this.state.orderByReverse),
      q: this.state.searchTerm !== '' ? this.state.searchTerm : null,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  getState({ isLoaded, searchTerm, selectedTags, paginator }) {
    return {
      title: $route.current.title,

      isLoaded,
      isEmpty: !isLoaded || (paginator.totalCount === 0),

      searchTerm,
      selectedTags,

      // sorting
      orderByField: paginator.orderByField,
      orderByReverse: paginator.orderByReverse,

      // pagination
      page: paginator.page,
      itemsPerPage: paginator.itemsPerPage,
      totalItemsCount: isLoaded ? paginator.totalCount : 0,
      pageSizeOptions: clientConfig.pageSizeOptions,
      pageItems: isLoaded ? paginator.getPageRows() : [],
    };
  }

  getStateWithUpdate({ isLoaded, searchTerm, selectedTags, paginator }) {
    isLoaded = defaultTo(isLoaded, this.state.isLoaded);
    searchTerm = defaultTo(searchTerm, this.state.searchTerm);
    selectedTags = defaultTo(selectedTags, this.state.selectedTags);
    return this.getState({ isLoaded, searchTerm, selectedTags, paginator });
  }

  constructor({ getRequest, doRequest, onChange }) {
    const params = this.getParamsFromUrl();
    const handlers = {
      getRequest: isFunction(getRequest) ? getRequest : identity,
      doRequest: isFunction(doRequest) ? doRequest : null, // fail-fast
      onChange: isFunction(onChange) ? onChange : noop,
    };

    const paginator = new LivePaginator(
      wrap(handlers, this._fetchData.bind(this)),
      params,
    );

    this.state = this.getState({
      isLoaded: false,
      searchTerm: params.searchTerm,
      selectedTags: [],
      paginator,
    });

    let savedOrderByField = paginator.orderByField;

    this.toggleSorting = (orderByField) => {
      paginator.orderBy(orderByField);
      savedOrderByField = paginator.orderByField;
    };
    this.updateSearch = (searchTerm) => {
      this.state.searchTerm = searchTerm;
      // in search mode ignore the ordering and use the ranking order
      // provided by the server-side FTS backend instead, unless it was
      // requested by the user by actively ordering in search mode
      if (this.state.searchTerm === '') {
        paginator.orderByField = savedOrderByField; // restore ordering
      } else {
        paginator.orderByField = null;
      }
      paginator.setPage(1);
    };
    this.updateSelectedTags = (selectedTags) => {
      this.state.selectedTags = selectedTags;
      paginator.setPage(1);
    };
    this.updatePagination = (updates) => {
      updates = extend({ page: paginator.page }, updates);
      paginator.setPage(updates.page, updates.itemsPerPage, updates.orderByField, updates.orderByField);
    };

    this.update = () => {
      paginator.fetchPage();
    };
  }

  getRequest() {
    return {
      page: this.state.page,
      page_size: this.state.itemsPerPage,
      order: prepareOrderByField(this.state.orderByField, this.state.orderByReverse),
      q: isString(this.state.searchTerm) && (this.state.searchTerm !== '') ? this.state.searchTerm : undefined,
      tags: this.state.selectedTags,
    };
  }

  _fetchData(handlers, paginator) {
    this.state = this.getStateWithUpdate({ isLoaded: false, paginator });
    handlers.onChange(this);

    this.updateUrlParams();

    const request = handlers.getRequest(this.getRequest());
    return handlers.doRequest(request).then((data) => {
      paginator.updateRows(data.results, data.count);
      this.state = this.getStateWithUpdate({ isLoaded: true, paginator });
      handlers.onChange(this);
    });
  }
}
