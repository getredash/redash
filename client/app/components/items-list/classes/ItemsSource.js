import { isFunction, isString, identity, map } from 'lodash';
import Paginator from './Paginator';
import Sorter from './Sorter';
import PromiseRejectionError from '@/lib/promise-rejection-error';

export class ItemsSource {
  onBeforeUpdate = null;

  onAfterUpdate = null;

  onError = null;

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

  _changed(changes) {
    if (this._isPlainList) {
      if (changes.tags || changes.sorting) {
        // For plain lists we need to reload items from server only if tags or search changes.
        return this.update();
      }
      // Sorting and pagination could be updated using previously fetched items.
      return this._beforeUpdate().then(() => {
        if (changes.sorting) {
          this._allitems = this._sorter.sort(this._allitems);
        }
        this._pageItems = this._paginator.getItemsForPage(this._allitems);
        return this._afterUpdate();
      });
    }
    // Server-side pagination - always do request
    return this.update();
  }

  _getRequest() {
    return this._originalGetRequest({
      page: this._paginator.page,
      page_size: this._paginator.itemsPerPage,
      order: this._sorter.compiled,
      q: isString(this._searchTerm) && (this._searchTerm !== '') ? this._searchTerm : undefined,
      tags: this._selectedTags,
    }, this.getCallbackContext());
  }

  _processResults(data) {
    if (this._isPlainList) {
      return {
        results: data,
        count: data.length,
      };
    }
    return data;
  }

  _updateResults(items, totalCount) {
    if (this._isPlainList) {
      this._allItems = this._sorter.sort(items);
      this._pageItems = this._paginator.getItemsForPage(this._allItems);
      this._paginator.setTotalCount(totalCount);
    } else {
      this._pageItems = items;
      this._paginator.setTotalCount(totalCount);
    }
  }

  _doRequest(request) {
    return this._beforeUpdate().then(() => (
      this._originalDoRequest(request, this.getCallbackContext())
        .then((data) => {
          const { results, count } = this._processResults(data);
          this._updateResults(results, count);
          return this._afterUpdate();
        })
        .catch((error) => {
          // ANGULAR_REMOVE_ME This code is related to Angular's HTTP services
          if (error.status && error.statusText && error.data) {
            error = new PromiseRejectionError(error.data.message);
          }
          this.handleError(error);
        })
    ));
  }

  constructor({ getRequest, doRequest, isPlainList = false, ...defaultState }) {
    if (!isFunction(getRequest)) {
      getRequest = identity;
    }

    this._originalGetRequest = getRequest;
    this._originalDoRequest = doRequest;

    this.setState(defaultState);
    this._pageItems = [];

    this._isPlainList = isPlainList;
    this._allItems = null; // used when `isPlainList === true`
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
    };
  }

  setState(state) {
    this._paginator = new Paginator(state);
    this._sorter = new Sorter(state);

    this._searchTerm = state.searchTerm || '';
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

  updateSearch = (searchTerm) => {
    // here we update state directly, but later `fetchData` will update it properly
    this._searchTerm = searchTerm;
    // in search mode ignore the ordering and use the ranking order
    // provided by the server-side FTS backend instead, unless it was
    // requested by the user by actively ordering in search mode
    if (searchTerm === '') {
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

  update = () => this._doRequest(this._getRequest());

  handleError(error) {
    if (isFunction(this.onError)) {
      this.onError(error);
    }
  }
}

export class ResourceItemsSource extends ItemsSource {
  _processResults(data) {
    const { results, count } = super._processResults(data);
    const processItem = this._getItemProcessor();
    const context = this.getCallbackContext();
    return {
      results: map(results, item => processItem(item, context)),
      count,
    };
  }

  constructor({ getResource, getItemProcessor, ...rest }) {
    super({
      ...rest,
      doRequest: (request, context) => {
        const resource = getResource(context);
        return resource(request).$promise;
      },
    });

    this._getItemProcessor = () => {
      const processItem = isFunction(getItemProcessor) ? getItemProcessor(this.getCallbackContext()) : null;
      return isFunction(processItem) ? processItem : identity;
    };
  }
}
