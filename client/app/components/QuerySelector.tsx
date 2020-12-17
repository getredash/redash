import { find } from "lodash";
import React, { useState, useEffect } from "react";
import cx from "classnames";
import Input from "antd/lib/input";
import Select from "antd/lib/select";
import { Query } from "@/services/query";
import notification from "@/services/notification";
import { QueryTagsControl } from "@/components/tags-control/TagsControl";
import useSearchResults from "@/lib/hooks/useSearchResults";
const { Option } = Select;
function search(term: any) {
    if (term === null) {
        return Promise.resolve(null);
    }
    // get recent
    if (!term) {
        return (Query as any).recent().then((results: any) => results.filter((item: any) => !item.is_draft)); // filter out draft
    }
    // search by query
    return (Query as any).query({ q: term }).then(({ results }: any) => results);
}
type OwnProps = {
    onChange: (...args: any[]) => any;
    selectedQuery?: any;
    type?: "select" | "default";
    className?: string;
    disabled?: boolean;
};
type Props = OwnProps & typeof QuerySelector.defaultProps;
export default function QuerySelector(props: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedQuery, setSelectedQuery] = useState();
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'never[]' is not assignable to type 'null | u... Remove this comment to see the full error message
    const [doSearch, searchResults, searching] = useSearchResults(search, { initialResults: [] });
    const placeholder = "Search a query by name";
    const clearIcon = <i className="fa fa-times hide-in-percy" onClick={() => selectQuery(null)}/>;
    const spinIcon = <i className={cx("fa fa-spinner fa-pulse hide-in-percy", { hidden: !searching })}/>;
    useEffect(() => {
        // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
        doSearch(searchTerm);
    }, [doSearch, searchTerm]);
    // set selected from prop
    useEffect(() => {
        if ((props as any).selectedQuery) {
            setSelectedQuery((props as any).selectedQuery);
        }
    }, [props]);
    function selectQuery(queryId: any) {
        let query = null;
        if (queryId) {
            // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
            query = find(searchResults, { id: queryId });
            if (!query) {
                // shouldn't happen
                // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 2.
                notification.error("Something went wrong...", "Couldn't select query");
            }
        }
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string | null' is not assignable... Remove this comment to see the full error message
        setSearchTerm(query ? null : ""); // empty string triggers recent fetch
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'unknown' is not assignable to pa... Remove this comment to see the full error message
        setSelectedQuery(query);
        (props as any).onChange(query);
    }
    function renderResults() {
        if (!(searchResults as any).length) {
            return <div className="text-muted">No results matching search term.</div>;
        }
        return (<div className="list-group">
        {(searchResults as any).map((q: any) => <a className={cx("query-selector-result", "list-group-item", { inactive: q.is_draft })} key={q.id} onClick={() => selectQuery(q.id)} data-test={`QueryId${q.id}`}>
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ isDraft: any; tags: any; className: string... Remove this comment to see the full error message */}
          {q.name} <QueryTagsControl isDraft={q.is_draft} tags={q.tags} className="inline-tags-control"/>
        </a>)}
      </div>);
    }
    if ((props as any).disabled) {
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        return <Input value={selectedQuery && selectedQuery.name} placeholder={placeholder} disabled/>;
    }
    if ((props as any).type === "select") {
        const suffixIcon = selectedQuery ? clearIcon : null;
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        const value = selectedQuery ? selectedQuery.name : searchTerm;
        return (<Select showSearch dropdownMatchSelectWidth={false} placeholder={placeholder} value={value || undefined} // undefined for the placeholder to show
         onSearch={setSearchTerm} onChange={selectQuery} suffixIcon={searching ? spinIcon : suffixIcon} notFoundContent={null} filterOption={false} defaultActiveFirstOption={false} className={(props as any).className} data-test="QuerySelector">
        {searchResults &&
            (searchResults as any).map((q: any) => {
                const disabled = q.is_draft;
                return (<Option value={q.id} key={q.id} disabled={disabled} className="query-selector-result" data-test={`QueryId${q.id}`}>
                {q.name}{" "}
                {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ isDraft: any; tags: any; className: string... Remove this comment to see the full error message */}
                <QueryTagsControl isDraft={q.is_draft} tags={q.tags} className={cx("inline-tags-control", { disabled })}/>
              </Option>);
            })}
      </Select>);
    }
    return (<span data-test="QuerySelector">
      {/* @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'. */}
      {selectedQuery ? (<Input value={selectedQuery.name} suffix={clearIcon} readOnly/>) : (<Input placeholder={placeholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} suffix={spinIcon}/>)}
      <div className="scrollbox" style={{ maxHeight: "50vh", marginTop: 15 }}>
        {searchResults && renderResults()}
      </div>
    </span>);
}
QuerySelector.defaultProps = {
    selectedQuery: null,
    type: "default",
    className: null,
    disabled: false,
};
