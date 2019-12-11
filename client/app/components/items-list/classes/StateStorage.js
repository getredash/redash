import { defaults } from "lodash";
import { clientConfig } from "@/services/auth";
import { $location } from "@/services/ng";
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
      tags: [],
    });
  }

  // eslint-disable-next-line class-methods-use-this
  setState() {}
}

export class UrlStateStorage extends StateStorage {
  getState() {
    const defaultState = super.getState();
    const params = $location.search();

    const searchTerm = params.q || "";

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
    };
  }

  // eslint-disable-next-line class-methods-use-this
  setState({ page, itemsPerPage, orderByField, orderByReverse, searchTerm }) {
    $location.search({
      page,
      page_size: itemsPerPage,
      order: compileOrderBy(orderByField, orderByReverse),
      q: searchTerm !== "" ? searchTerm : null,
    });
  }
}
