import { isFunction, identity, map, extend } from "lodash";
import Paginator from "./Paginator";
import Sorter from "./Sorter";
import { PlainListFetcher, PaginatedListFetcher } from "./ItemsFetcher";

export class ItemsSource {
  onBeforeUpdate = null;

  onAfterUpdate = null;

  onError = null;

  sortByIteratees = undefined;

  getCallbackContext = () => null;

  _beforeUpdate() {
    if (isFunction(this.onBeforeUpdate)) {
      return Promise.resolve(this.onBeforeUpdate(this.getState(), this.getCallbackContext()));
    }
    return Promise.resolve();
  }

  _afterUpdate() {
    if (isFunction(this.onAfterUpdate)) {
      return Promise.resolve(this.onAfterUpdate(this.getState(), this.getCallbackContext()));
    }
    return Promise.resolve();
  }

  // changes: object with flags or null (full refresh requested)
  _changed(changes) {
    const state = {
      paginator: this._paginator,
      sorter: this._sorter,
      searchTerm: this._searchTerm,
      selectedTags: this._selectedTags,
    };
    const customParams = {};
    const context = {
      ...this.getCallbackContext(),
      setCustomParams: (params) => {
        extend(customParams, params);
      },
    };
    return this._beforeUpdate().then(() => {
      const fetchToken = Math.random().toString(36).substr(2);
      this._currentFetchToken = fetchToken;
      return this._fetcher
        .fetch(changes, state, context)
        .then(({ results, count, allResults }) => {
          if (this._currentFetchToken === fetchToken) {
            this._pageItems = results;
            this._allItems = allResults || null;
            this._paginator.setTotalCount(count);
            this._params = { ...this._params, ...customParams };
            return this._afterUpdate();
          }
        })
        .catch((error) => this.handleError(error));
    });
  }

  constructor({
    getRequest,
    doRequest,
    processResults,
    isPlainList = false,
    sortByIteratees = undefined,
    ...defaultState
  }) {
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

  setState(state) {
    this._paginator = new Paginator(state);
    this._sorter = new Sorter(state, this.sortByIteratees);

    this._searchTerm = state.searchTerm || "";
    this._selectedTags = state.selectedTags || [];

    this._savedOrderByField = this._sorter.field;
  }

  updatePagination = ({ page, itemsPerPage }) => {
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

  toggleSorting = (orderByField) => {
    this._sorter.toggleField(orderByField);
    this._savedOrderByField = this._sorter.field;
    this._changed({ sorting: true });
  };

  setSorting = (orderByField, orderByReverse) => {
    this._sorter.setField(orderByField);
    this._sorter.setReverse(orderByReverse);
    this._savedOrderByField = this._sorter.field;
    this._changed({ sorting: true });
  };

  updateSearch = (searchTerm) => {
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

  updateSelectedTags = (selectedTags) => {
    this._selectedTags = selectedTags;
    this._paginator.setPage(1);
    this._changed({ tags: true, pagination: { page: true } });
  };

  update = () => this._changed();

  handleError = (error) => {
    if (isFunction(this.onError)) {
      this.onError(error);
    }
  };
}

export class ResourceItemsSource extends ItemsSource {
  constructor({ getResource, getItemProcessor, ...rest }) {
    getItemProcessor = isFunction(getItemProcessor) ? getItemProcessor : () => null;
    super({
      ...rest,
      doRequest: (request, context) => {
        const resource = getResource(context)(request);
        return resource;
      },
      processResults: (results, context) => {
        let processItem = getItemProcessor(context);
        processItem = isFunction(processItem) ? processItem : identity;
        return map(results, (item) => processItem(item, context));
      },
    });
  }
}
