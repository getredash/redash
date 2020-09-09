import { useCallback } from "react";

export default function useAddToRecentsAtLocalStorage(id, localStorageProperty) {
  function updateList (list, id) {
    const itemArrayIndex = list.indexOf(id);
    const itemIsAlreadyOnTheList = itemArrayIndex !== -1;
    if(itemIsAlreadyOnTheList)
      list.splice(itemArrayIndex, 1);
    list.unshift(id);
    return list;
  }

  return useCallback(() => {
    const formatedId = Number(id)
    const currentList = localStorage.getItem(localStorageProperty);
    if(!currentList){
      localStorage.setItem(localStorageProperty, JSON.stringify([formatedId]));
      return;
    }
    const parsedCurrentList = JSON.parse(currentList);
    const updatedList = updateList(parsedCurrentList, formatedId);
    localStorage.setItem(localStorageProperty, JSON.stringify(updatedList));
  }, [id, localStorageProperty]);
}
