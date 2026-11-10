import { defaults, uniq } from "lodash";
import { clientConfig } from "@/services/auth";
import location from "@/services/location";
import { parse as parseOrderBy, compile as compileOrderBy } from "./Sorter";

export class StateStorage {
  constructor(state = {}) {
    this._state = { ...state };
  }

  getState() {
    return defaults(this._state, {
      page: 1,
      itemsPerPage: clientConfig.pageSize,
      orderByField: "created_at",
      orderByReverse: false,
      searchTerm: "",
      selectedTags: [],
    });
  }

  setState() {}

  listen() {
    return () => {};
  }
}

export class UrlStateStorage extends StateStorage {
  _isWritingState = false;

  getState() {
    const defaultState = super.getState();
    const params = location.search;

    const searchTerm = params.q || "";
    const selectedTags = uniq([].concat(params.tags || []).filter((tag) => typeof tag === "string" && tag !== ""));

    // in search mode order by should be explicitly specified in url, otherwise use default
    const defaultOrderBy =
      searchTerm !== "" ? "" : compileOrderBy(defaultState.orderByField, defaultState.orderByReverse);

    const { field: orderByField, reverse: orderByReverse } = parseOrderBy(params.order || defaultOrderBy);

    return {
      page: parseInt(params.page, 10) || defaultState.page,
      itemsPerPage: parseInt(params.page_size, 10) || defaultState.itemsPerPage,
      orderByField,
      orderByReverse,
      searchTerm,
      selectedTags,
    };
  }

  setState({ page, itemsPerPage, orderByField, orderByReverse, searchTerm, selectedTags = [] }) {
    this._isWritingState = true;
    try {
      location.setSearch(
        {
          page,
          page_size: itemsPerPage,
          order: compileOrderBy(orderByField, orderByReverse),
          q: searchTerm !== "" ? searchTerm : null,
          tags: selectedTags.length > 0 ? selectedTags : null,
        },
        true
      );
    } finally {
      this._isWritingState = false;
    }
  }

  listen(onChange) {
    const path = location.path;
    return location.listen(() => {
      // Path changes remount the page; query-string changes need restoring here.
      if (!this._isWritingState && location.path === path) {
        onChange(this.getState());
      }
    });
  }
}
