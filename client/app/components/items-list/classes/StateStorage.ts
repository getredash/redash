import { defaults } from "lodash";
import { clientConfig } from "@/services/auth";
import location from "@/services/location";
import { parse as parseOrderBy, compile as compileOrderBy } from "./Sorter";
export class StateStorage {
    _state: any;
    constructor(state = {}) {
        this._state = { ...state };
    }
    getState() {
        return defaults(this._state, {
            page: 1,
            itemsPerPage: (clientConfig as any).pageSize,
            orderByField: "created_at",
            orderByReverse: false,
            searchTerm: "",
            tags: [],
        });
    }
    // eslint-disable-next-line class-methods-use-this
    setState() { }
}
export class UrlStateStorage extends StateStorage {
    getState() {
        const defaultState = super.getState();
        const params = location.search;
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        const searchTerm = params.q || "";
        // in search mode order by should be explicitly specified in url, otherwise use default
        const defaultOrderBy = searchTerm !== "" ? "" : compileOrderBy(defaultState.orderByField, defaultState.orderByReverse);
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        const { field: orderByField, reverse: orderByReverse } = parseOrderBy(params.order || defaultOrderBy);
        return {
            // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
            page: parseInt(params.page, 10) || defaultState.page,
            // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
            itemsPerPage: parseInt(params.page_size, 10) || defaultState.itemsPerPage,
            orderByField,
            orderByReverse,
            searchTerm,
        };
    }
    // @ts-expect-error ts-migrate(2416) FIXME: Property 'setState' in type 'UrlStateStorage' is n... Remove this comment to see the full error message
    // eslint-disable-next-line class-methods-use-this
    setState({ page, itemsPerPage, orderByField, orderByReverse, searchTerm }: any) {
        location.setSearch({
            page,
            page_size: itemsPerPage,
            order: compileOrderBy(orderByField, orderByReverse),
            q: searchTerm !== "" ? searchTerm : null,
        }, true);
    }
}
