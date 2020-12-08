// @ts-expect-error ts-migrate(6133) FIXME: 'extend' is declared but its value is never read.
import { isFunction, identity, map, extend } from "lodash";
import Paginator from "./Paginator";
import Sorter from "./Sorter";
import { PlainListFetcher, PaginatedListFetcher } from "./ItemsFetcher";

export class ItemsSource {
  _allItems: any;
  _currentFetchToken: any;
  _fetcher: any;
  _pageItems: any;
  _paginator: any;
  _params: any;
  _savedOrderByField: any;
  _searchTerm: any;
  _selectedTags: any;
  _sorter: any;
  onBeforeUpdate = null;

  onAfterUpdate = null;

  onError = null;

  sortByIteratees = undefined;

  getCallbackContext = () => null;

  _beforeUpdate() {
    if (isFunction(this.onBeforeUpdate)) {
      // @ts-expect-error ts-migrate(2721) FIXME: Cannot invoke an object which is possibly 'null'.
      return Promise.resolve(this.onBeforeUpdate(this.getState(), this.getCallbackContext()));
    }
    return Promise.resolve();
  }

  _afterUpdate() {
    if (isFunction(this.onAfterUpdate)) {
      // @ts-expect-error ts-migrate(2721) FIXME: Cannot invoke an object which is possibly 'null'.
      return Promise.resolve(this.onAfterUpdate(this.getState(), this.getCallbackContext()));
    }
    return Promise.resolve();
  }

  // changes: object with flags or null (full refresh requested)
  _changed(changes: any) {
    const state = {
      paginator: this._paginator,
      sorter: this._sorter,
      searchTerm: this._searchTerm,
      selectedTags: this._selectedTags,
    };
    const customParams = {};
    const context = {
      // @ts-expect-error ts-migrate(2698) FIXME: Spread types may only be created from object types... Remove this comment to see the full error message
      ...this.getCallbackContext(),
      setCustomParams: params => {
        extend(customParams, params);
      },
    };
    return this._beforeUpdate().then(() => {
      const fetchToken = Math.random()
        .toString(36)
        .substr(2);
      this._currentFetchToken = fetchToken;
      return this._fetcher
        .fetch(changes, state, context)
        .then(({
        results,
        count,
        allResults
      }: any) => {
          if (this._currentFetchToken === fetchToken) {
            this._pageItems = results;
            this._allItems = allResults || null;
            this._paginator.setTotalCount(count);
            this._params = { ...this._params, ...customParams };
            return this._afterUpdate();
          }
        })
        .catch((error: any) => this.handleError(error));
    });
  }

  constructor({
    getRequest,
    doRequest,
    processResults,
    isPlainList = false,
    sortByIteratees = undefined,
    ...defaultState
  }: any) {
    if (!isFunction(getRequest)) {
      getRequest = identity;
    }

    this._fetcher = isPlainList
      ? new PlainListFetcher({ getRequest, doRequest, processResults })
      : new PaginatedListFetcher({ getRequest, doRequest, processResults });

    this.sortByIteratees = sortByIteratees;

    this.setState(defaultState);
    this._pageItems = [];

    this._params = {};
  }

  getState() {
    return {
      page: this._paginator.page,
      itemsPerPage: this._paginator.itemsPerPage,
      orderByField: this._sorter.field,
      orderByReverse: this._sorter.reverse,
      searchTerm: this._searchTerm,
      selectedTags: this._selectedTags,
      totalCount: this._paginator.totalCount,
      pageItems: this._pageItems,
      allItems: this._allItems,
      params: this._params,
    };
  }

  setState(state: any) {
    this._paginator = new Paginator(state);
    this._sorter = new Sorter(state, this.sortByIteratees);

    this._searchTerm = state.searchTerm || "";
    this._selectedTags = state.selectedTags || [];

    this._savedOrderByField = this._sorter.field;
  }

  updatePagination = ({
    page,
    itemsPerPage
  }: any) => {
    const { page: prevPage, itemsPerPage: prevItemsPerPage } = this._paginator;
    this._paginator.setItemsPerPage(itemsPerPage);
    this._paginator.setPage(page);
    this._changed({
      pagination: {
        page: prevPage !== this._paginator.page, // page changed flag
        itemsPerPage: prevItemsPerPage !== this._paginator.itemsPerPage, // items per page changed flags
      },
    });
  };

  toggleSorting = (orderByField: any) => {
    this._sorter.toggleField(orderByField);
    this._savedOrderByField = this._sorter.field;
    this._changed({ sorting: true });
  };

  updateSearch = (searchTerm: any) => {
    // here we update state directly, but later `fetchData` will update it properly
    this._searchTerm = searchTerm;
    // in search mode ignore the ordering and use the ranking order
    // provided by the server-side FTS backend instead, unless it was
    // requested by the user by actively ordering in search mode
    if (searchTerm === "") {
      this._sorter.setField(this._savedOrderByField); // restore ordering
    } else {
      this._sorter.setField(null);
    }
    this._paginator.setPage(1);
    this._changed({ search: true, pagination: { page: true } });
  };

  updateSelectedTags = (selectedTags: any) => {
    this._selectedTags = selectedTags;
    this._paginator.setPage(1);
    this._changed({ tags: true, pagination: { page: true } });
  };

  // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
  update = () => this._changed();

  handleError = (error: any) => {
    if (isFunction(this.onError)) {
      // @ts-expect-error ts-migrate(2721) FIXME: Cannot invoke an object which is possibly 'null'.
      this.onError(error);
    }
  };
}

export class ResourceItemsSource extends ItemsSource {
  constructor({
    getResource,
    getItemProcessor,
    ...rest
  }: any) {
    getItemProcessor = isFunction(getItemProcessor) ? getItemProcessor : () => null;
    super({
      ...rest,
      doRequest: (request: any, context: any) => {
        const resource = getResource(context)(request);
        return resource;
      },
      processResults: (results: any, context: any) => {
        let processItem = getItemProcessor(context);
        processItem = isFunction(processItem) ? processItem : identity;
        return map(results, item => processItem(item, context));
      },
    });
  }
}
