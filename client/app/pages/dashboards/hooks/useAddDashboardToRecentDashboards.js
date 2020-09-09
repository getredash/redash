import { useCallback } from "react";

export default function useAddDashboardToRecentDashboards(dashboardId) {
  function updateList (list, id) {
    const itemArrayIndex = list.indexOf(id);
    const itemIsAlreadyOnTheList = itemArrayIndex !== -1;
    if(itemIsAlreadyOnTheList)
      list.splice(itemArrayIndex, 1);
    list.unshift(id);
    return list;
  }

  return useCallback(() => {
    const id = Number(dashboardId)
    const currentList = localStorage.getItem("recentDashboards");
    if(!currentList){
      localStorage.setItem("recentDashboards", JSON.stringify([id]));
      return;
    }
    const parsedCurrentList = JSON.parse(currentList);
    const updatedList = updateList(parsedCurrentList, id);
    localStorage.setItem("recentDashboards", JSON.stringify(updatedList));
  }, [dashboardId]);
}
