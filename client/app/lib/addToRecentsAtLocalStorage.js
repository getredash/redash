function updateList (list, id) {
  const itemArrayIndex = list.indexOf(id);
  const itemIsAlreadyOnTheList = itemArrayIndex !== -1;
  if(itemIsAlreadyOnTheList)
    list.splice(itemArrayIndex, 1);
  list.unshift(id);
  return list;
}

export default function addToRecentsAtLocalStorage(id, localStorageProperty) {
  const currentList = localStorage.getItem(localStorageProperty);
  if(!currentList){
    localStorage.setItem(localStorageProperty, JSON.stringify([id]));
    return;
  }
  const parsedCurrentList = JSON.parse(currentList);
  const updatedList = updateList(parsedCurrentList, id);
  localStorage.setItem(localStorageProperty, JSON.stringify(updatedList));
}
