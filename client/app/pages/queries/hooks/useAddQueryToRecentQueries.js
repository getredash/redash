import { reduce, map, find } from "lodash";
import { useCallback } from "react";

export default function useAddQueryToRecentQueries(query) {
  return useCallback(() => {
    const currentRecentQueries = localStorage.getItem("recentQueries");
    if (!currentRecentQueries) {
      localStorage.setItem("recentQueries", JSON.stringify([{ id: query.id, priority: 1 }]));
    } else {
      const parsedCurrentRecentQueries = JSON.parse(currentRecentQueries);
      const currentRecentQueriesPrioritys = map(parsedCurrentRecentQueries, recentQuery => recentQuery.priority);
      const recentQueriesIncludesCurrentQuery =
        find(parsedCurrentRecentQueries, recentQuery => recentQuery.id === query.id) !== undefined;
      const biggestPriorityValue = reduce(currentRecentQueriesPrioritys, (a, b) => Math.max(a, b));
      if (recentQueriesIncludesCurrentQuery) {
        const newRecentQueries = map(parsedCurrentRecentQueries, recentQuery =>
          recentQuery.id === query.id ? { id: query.id, priority: biggestPriorityValue + 1 } : recentQuery
        );
        localStorage.setItem("recentQueries", JSON.stringify(newRecentQueries));
      } else {
        parsedCurrentRecentQueries.push({ id: query.id, priority: biggestPriorityValue + 1 });
        localStorage.setItem("recentQueries", JSON.stringify(parsedCurrentRecentQueries));
      }
    }
  }, [query.id]);
}
