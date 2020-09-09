import { useCallback } from "react";

export default function useAddQueryToRecentQueries(query) {
  function updateList (list, id) {
    const itemArrayIndex = list.indexOf(id);
    const itemIsAlreadyOnTheList = itemArrayIndex !== -1;
    if(itemIsAlreadyOnTheList)
      list.splice(itemArrayIndex, 1);
    list.unshift(id);
    return list;
  }

  return useCallback(() => {
    const currentList = localStorage.getItem("recentQueries");
    if(!currentList){
      localStorage.setItem("recentQueries", JSON.stringify([query.id]));
      return;
    }
    const parsedCurrentList = JSON.parse(currentList);
    const updatedList = updateList(parsedCurrentList, query.id);
    localStorage.setItem("recentQueries", JSON.stringify(updatedList));
  }, [query.id]);
}
