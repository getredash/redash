import { identity, isFunction, isNil, isString } from "lodash";

class ItemsFetcher {
  _getRequest(state, context) {
    return this._originalGetRequest({}, context);
  }

  _processResults({ results, count }, state, context) {
    return {
      results: this._originalProcessResults(results, context),
      count,
    };
  }

  constructor({ getRequest, doRequest, processResults }) {
    this._originalGetRequest = isFunction(getRequest) ? getRequest : identity;
    this._originalDoRequest = doRequest;
    this._originalProcessResults = isFunction(processResults) ? processResults : identity;
  }

  fetch(changes, state, context) {
    const request = this._getRequest(state, context);
    return this._originalDoRequest(request, context).then(data => this._processResults(data, state, context));
  }
}

// For endpoints that return just an array with items; sorting and pagination
// is performed on client
export class PlainListFetcher extends ItemsFetcher {
  _allItems = [];

  _getRequest({ searchTerm, selectedTags }, context) {
    return this._originalGetRequest(
      {
        q: isString(searchTerm) && searchTerm !== "" ? searchTerm : undefined,
        tags: selectedTags,
      },
      context
    );
  }

  _processResults(data, { paginator, sorter }, context) {
    this._allItems = this._originalProcessResults(data, context);
    this._allItems = sorter.sort(this._allItems);
    return {
      results: paginator.getItemsForPage(this._allItems),
      count: this._allItems.length,
      allResults: this._allItems,
    };
  }

  fetch(changes, state, context) {
    // For plain lists we need to reload items from server only if tags or search changes.
    if (isNil(changes) || changes.tags || changes.sorting) {
      return super.fetch(changes, state, context);
    }
    // Sorting and pagination could be updated using previously fetched items.
    const { paginator, sorter } = state;
    if (changes.sorting) {
      this._allItems = sorter.sort(this._allItems);
    }
    return Promise.resolve({
      results: paginator.getItemsForPage(this._allItems),
      count: this._allItems.length,
      allResults: this._allItems,
    });
  }
}

// For endpoints that support server-side pagination (return object with
// items for current page and total items count)
export class PaginatedListFetcher extends ItemsFetcher {
  _getRequest({ paginator, sorter, searchTerm, selectedTags }, context) {
    return this._originalGetRequest(
      {
        page: paginator.page,
        page_size: paginator.itemsPerPage,
        order: sorter.compiled,
        q: isString(searchTerm) && searchTerm !== "" ? searchTerm : undefined,
        tags: selectedTags,
      },
      context
    );
  }
}
