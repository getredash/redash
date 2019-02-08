import { isFunction, isString, identity, map } from 'lodash';
import Paginator from './Paginator';
import Sorter from './Sorter';
import PromiseRejectionError from '@/lib/promise-rejection-error';

class BasicItemsSource {
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

  // eslint-disable-next-line no-unused-vars
  _changed(changes) {
    this.update();
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

  // eslint-disable-next-line class-methods-use-this
  _processResults(data) {
    return data;
  }

  _updateResults(items, totalCount) {
    this._pageItems = items;
    this._paginator.setTotalCount(totalCount);
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

  constructor({ getRequest, doRequest, ...defaultState }) {
    if (!isFunction(getRequest)) {
      getRequest = identity;
    }

    this._originalGetRequest = getRequest;
    this._originalDoRequest = doRequest;

    this.setState(defaultState);
    this._pageItems = [];
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

export class PlainItemsSource extends BasicItemsSource {
  _items = [];

  // eslint-disable-next-line class-methods-use-this
  _processResults(data) {
    return {
      results: data,
      count: data.length,
    };
  }

  _updateResults(items, totalCount) {
    this._items = this._sorter.sort(items);
    this._pageItems = this._paginator.getItemsForPage(this._items);
    this._paginator.setTotalCount(totalCount);
  }

  _changed({ sorting, pagination: { page } }) {
    if (sorting || page) {
      this._beforeUpdate().then(() => {
        if (sorting) {
          this._items = this._sorter.sort(this._items);
        }
        this._pageItems = this._paginator.getItemsForPage(this._items);
        this._afterUpdate();
      });
    } else {
      this.update();
    }
  }
}

export class ItemsSource extends BasicItemsSource {
}

export class ResourceItemsSource extends PlainItemsSource {
  static _processPlainList(results, processItem, context) {
    return map(results, item => processItem(item, context));
  }

  static _processPaginatedList({ results, count }, processItem, context) {
    return {
      results: map(results, item => processItem(item, context)),
      count,
    };
  }

  static _createResourceFetcher(getResource, getItemProcessor, processResults) {
    getItemProcessor = isFunction(getItemProcessor) ? getItemProcessor : () => identity;

    return (request, context) => {
      const resource = getResource(context);

      let processItem = getItemProcessor(context);
      processItem = isFunction(processItem) ? processItem : item => item;

      return resource(request).$promise.then(data => processResults(data, processItem, context));
    };
  }

  _processResults(data) {
    if (this._isPlainList) {
      return super._processResults(data); // from PlainItemsSource
    }
    return data; // same as in ItemsSource
  }

  _updateResults(items, totalCount) {
    if (this._isPlainList) {
      super._updateResults(items, totalCount); // from PlainItemsSource
    } else {
      // same as in ItemsSource
      this._pageItems = items;
      this._paginator.setTotalCount(totalCount);
    }
  }

  _changed(changes) {
    if (this._isPlainList) {
      super._changed(changes); // from PlainItemsSource
    } else {
      this.update(); // same as in ItemsSource
    }
  }

  constructor({ getResource, getItemProcessor, isPlainList = false, ...rest }) {
    const processResult = isPlainList ?
      ResourceItemsSource._processPlainList :
      ResourceItemsSource._processPaginatedList;
    super({
      ...rest,
      doRequest: ResourceItemsSource._createResourceFetcher(getResource, getItemProcessor, processResult),
    });
    this._isPlainList = isPlainList;
  }
}
