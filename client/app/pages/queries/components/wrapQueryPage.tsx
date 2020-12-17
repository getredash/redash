import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import LoadingState from "@/components/items-list/components/LoadingState";
import { Query } from "@/services/query";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
export default function wrapQueryPage(WrappedComponent: any) {
    function QueryPageWrapper({ queryId, onError, ...props }: any) {
        const [query, setQuery] = useState(null);
        const handleError = useImmutableCallback(onError);
        useEffect(() => {
            let isCancelled = false;
            const promise = queryId ? (Query as any).get({ id: queryId }) : Promise.resolve((Query as any).newQuery());
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
            return <LoadingState className="flex-fill"/>;
        }
        return <WrappedComponent query={query} onError={onError} {...props}/>;
    }
    QueryPageWrapper.propTypes = {
        queryId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    };
    QueryPageWrapper.defaultProps = {
        queryId: null,
    };
    return QueryPageWrapper;
}
