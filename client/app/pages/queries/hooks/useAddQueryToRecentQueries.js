import { reduce, map, find } from "lodash";
import { useCallback } from "react";

export default function useAddQueryToRecentQueries(query) {
  return useCallback(() => {
    const currentRecentQueries = localStorage.getItem("recentQueries");
    if (!currentRecentQueries) {
      localStorage.setItem("recentQueries", JSON.stringify([{ id: query.id, priority: 1 }]));
      return;
    }
    const parsedCurrentRecentQueries = JSON.parse(currentRecentQueries);
    const currentRecentQueriesPrioritys = map(parsedCurrentRecentQueries, recentQuery => recentQuery.priority);
    const recentQueriesIncludesCurrentQuery =
      find(parsedCurrentRecentQueries, recentQuery => recentQuery.id === query.id) !== undefined;
    const biggestPriorityValue = reduce(currentRecentQueriesPrioritys, (a, b) => Math.max(a, b));
    let queriesToSave;
    if(recentQueriesIncludesCurrentQuery) {
      queriesToSave = map(parsedCurrentRecentQueries, recentQuery =>
        recentQuery.id === query.id ? { id: query.id, priority: biggestPriorityValue + 1 } : recentQuery
      )
    } else {
      parsedCurrentRecentQueries.push({ id: query.id, priority: biggestPriorityValue + 1 });
      queriesToSave = parsedCurrentRecentQueries;
    }
    localStorage.setItem("recentQueries", JSON.stringify(queriesToSave));
  }, [query.id]);
}
