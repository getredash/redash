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
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'recent' does not exist on type 'typeof Q... Remove this comment to see the full error message
    return Query.recent().then((results: any) => results.filter((item: any) => !item.is_draft)); // filter out draft
  }

  // search by query
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'query' does not exist on type 'typeof Qu... Remove this comment to see the full error message
  return Query.query({ q: term }).then(({
    results
  }: any) => results);
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
  const clearIcon = <i className="fa fa-times hide-in-percy" onClick={() => selectQuery(null)} />;
  const spinIcon = <i className={cx("fa fa-spinner fa-pulse hide-in-percy", { hidden: !searching })} />;

  useEffect(() => {
    // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
    doSearch(searchTerm);
  }, [doSearch, searchTerm]);

  // set selected from prop
  useEffect(() => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'selectedQuery' does not exist on type 'n... Remove this comment to see the full error message
    if (props.selectedQuery) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'selectedQuery' does not exist on type 'n... Remove this comment to see the full error message
      setSelectedQuery(props.selectedQuery);
    }
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'selectedQuery' does not exist on type 'n... Remove this comment to see the full error message
  }, [props.selectedQuery]);

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
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'onChange' does not exist on type 'never'... Remove this comment to see the full error message
    props.onChange(query);
  }

  function renderResults() {
    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
    if (!searchResults.length) {
      return <div className="text-muted">No results matching search term.</div>;
    }

    return (
      <div className="list-group">
        {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
        {searchResults.map((q: any) => <a
          className={cx("query-selector-result", "list-group-item", { inactive: q.is_draft })}
          key={q.id}
          onClick={() => selectQuery(q.id)}
          data-test={`QueryId${q.id}`}>
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ isDraft: any; tags: any; className: string... Remove this comment to see the full error message */}
          {q.name} <QueryTagsControl isDraft={q.is_draft} tags={q.tags} className="inline-tags-control" />
        </a>)}
      </div>
    );
  }

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'disabled' does not exist on type 'never'... Remove this comment to see the full error message
  if (props.disabled) {
    // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
    return <Input value={selectedQuery && selectedQuery.name} placeholder={placeholder} disabled />;
  }

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'type' does not exist on type 'never'.
  if (props.type === "select") {
    const suffixIcon = selectedQuery ? clearIcon : null;
    // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
    const value = selectedQuery ? selectedQuery.name : searchTerm;

    return (
      <Select
        showSearch
        dropdownMatchSelectWidth={false}
        placeholder={placeholder}
        value={value || undefined} // undefined for the placeholder to show
        onSearch={setSearchTerm}
        onChange={selectQuery}
        suffixIcon={searching ? spinIcon : suffixIcon}
        notFoundContent={null}
        filterOption={false}
        defaultActiveFirstOption={false}
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'className' does not exist on type 'never... Remove this comment to see the full error message
        className={props.className}
        data-test="QuerySelector">
        {searchResults &&
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'map' does not exist on type 'true | ((se... Remove this comment to see the full error message
          searchResults.map((q: any) => {
            const disabled = q.is_draft;
            return (
              <Option
                value={q.id}
                key={q.id}
                disabled={disabled}
                className="query-selector-result"
                data-test={`QueryId${q.id}`}>
                {q.name}{" "}
                <QueryTagsControl
                  isDraft={q.is_draft}
                  // @ts-expect-error ts-migrate(2322) FIXME: Type '{ isDraft: any; tags: any; className: string... Remove this comment to see the full error message
                  tags={q.tags}
                  className={cx("inline-tags-control", { disabled })}
                />
              </Option>
            );
          })}
      </Select>
    );
  }

  return (
    <span data-test="QuerySelector">
      {selectedQuery ? (
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        <Input value={selectedQuery.name} suffix={clearIcon} readOnly />
      ) : (
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          suffix={spinIcon}
        />
      )}
      <div className="scrollbox" style={{ maxHeight: "50vh", marginTop: 15 }}>
        {searchResults && renderResults()}
      </div>
    </span>
  );
}

QuerySelector.defaultProps = {
  selectedQuery: null,
  type: "default",
  className: null,
  disabled: false,
};
