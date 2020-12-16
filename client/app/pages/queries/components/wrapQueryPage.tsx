import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import LoadingState from "@/components/items-list/components/LoadingState";
import { Query } from "@/services/query";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";

export default function wrapQueryPage(WrappedComponent: any) {
  function QueryPageWrapper({
    queryId,
    onError,
    ...props
  }: any) {
    const [query, setQuery] = useState(null);

    const handleError = useImmutableCallback(onError);

    useEffect(() => {
      let isCancelled = false;
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'get' does not exist on type 'typeof Quer... Remove this comment to see the full error message
      const promise = queryId ? Query.get({ id: queryId }) : Promise.resolve(Query.newQuery());
      promise
        .then((result: any) => {
          if (!isCancelled) {
            setQuery(result);
          }
        })
        .catch(handleError);

      return () => {
        isCancelled = true;
      };
    }, [queryId, handleError]);

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
