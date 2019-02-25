import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { debounce, find } from 'lodash';
import Input from 'antd/lib/input';
import { Query } from '@/services/query';
import { toastr } from '@/services/ng';
import { QueryTagsControl } from '@/components/tags-control/TagsControl';

const SEARCH_DEBOUNCE_DURATION = 200;

function search(term) {
  // get recent
  if (!term) {
    return Query.recent().$promise
      .then((results) => {
        const filteredResults = results.filter(item => !item.is_draft); // filter out draft
        return Promise.resolve(filteredResults);
      });
  }

  // search by query
  return Query.query({ q: term }).$promise
    .then(({ results }) => Promise.resolve(results));
}

export function QuerySelector(props) {
  const [searchTerm, setSearchTerm] = useState();
  const [searching, setSearching] = useState();
  const [searchResults, setSearchResults] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState();

  let isStaleSearch = false;
  const debouncedSearch = debounce(_search, SEARCH_DEBOUNCE_DURATION);
  const placeholder = 'Search a query by name';
  const clearIcon = <i className="fa fa-times" onClick={() => setSelectedQuery(null)} />;
  const spinIcon = <i className={cx('fa fa-spinner fa-pulse', { hidden: !searching })} />;

  // set selected from prop
  useEffect(() => {
    if (props.selectedQuery) {
      setSelectedQuery(props.selectedQuery);
    }
  }, [props.selectedQuery]);

  // on search term changed, debounced
  useEffect(() => {
    // clear results, no search
    if (searchTerm === null) {
      setSearchResults(null);
      return () => {};
    }

    // search
    debouncedSearch(searchTerm);
    return () => {
      debouncedSearch.cancel();
      isStaleSearch = true;
    };
  }, [searchTerm]);

  // on query selected/cleared
  useEffect(() => {
    setSearchTerm(selectedQuery ? null : ''); // empty string forces recent fetch
    props.onChange(selectedQuery);
  }, [selectedQuery]);

  function _search(term) {
    setSearching(true);
    search(term)
      .then(rejectStale)
      .then(setSearchResults)
      .finally(() => {
        setSearching(false);
      });
  }

  function rejectStale(results) {
    return isStaleSearch
      ? Promise.reject(new Error('stale'))
      : Promise.resolve(results);
  }

  function selectQuery(queryId) {
    const query = find(searchResults, { id: queryId });
    if (!query) { // shouldn't happen
      toastr.error('Something went wrong.. Couldn\'t select query');
    }
    setSelectedQuery(query);
  }

  function renderResults() {
    if (!searchResults.length) {
      return <div className="text-muted">No results matching search term.</div>;
    }

    return (
      <div className="list-group">
        {searchResults.map(q => (
          <a
            href="javascript:void(0)"
            className={cx('list-group-item', { inactive: q.is_draft })}
            key={q.id}
            onClick={() => selectQuery(q.id)}
          >
            {q.name}
            {' '}
            <QueryTagsControl isDraft={q.is_draft} tags={q.tags} className="inline-tags-control" />
          </a>
        ))}
      </div>
    );
  }

  if (props.disabled) {
    return <Input value={selectedQuery && selectedQuery.name} placeholder={placeholder} disabled />;
  }

  return (
    <React.Fragment>
      {selectedQuery ? (
        <Input value={selectedQuery.name} suffix={clearIcon} readOnly />
      ) : (
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          suffix={spinIcon}
        />
      )}
      <div className="scrollbox" style={{ maxHeight: '50vh', marginTop: 15 }}>
        {searchResults && renderResults()}
      </div>
    </React.Fragment>
  );
}

QuerySelector.propTypes = {
  onChange: PropTypes.func.isRequired,
  selectedQuery: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  disabled: PropTypes.bool,
};

QuerySelector.defaultProps = {
  selectedQuery: null,
  disabled: false,
};

export default QuerySelector;
