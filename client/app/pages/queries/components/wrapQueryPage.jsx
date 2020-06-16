import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import LoadingState from "@/components/items-list/components/LoadingState";
import { Query } from "@/services/query";

export default function wrapQueryPage(WrappedComponent) {
  function QueryPageWrapper({ queryId, onError, ...props }) {
    const [query, setQuery] = useState(null);
    const onErrorRef = useRef();
    onErrorRef.current = onError;

    useEffect(() => {
      let isCancelled = false;
      const promise = queryId ? Query.get({ id: queryId }) : Promise.resolve(Query.newQuery());
      promise
        .then(result => {
          if (!isCancelled) {
            setQuery(result);
          }
        })
        .catch(error => onErrorRef.current(error));

      return () => {
        isCancelled = true;
      };
    }, [queryId]);

    if (!query) {
      return <LoadingState className="flex-fill" />;
    }

    return <WrappedComponent query={query} onError={onError} {...props} />;
  }

  QueryPageWrapper.propTypes = {
    queryId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  };

  QueryPageWrapper.defaultProps = {
    queryId: null,
  };

  return QueryPageWrapper;
}
