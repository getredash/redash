export class RecentObjectsManager {
  _removeMostOutdatedItemIfTypeLimit(list, objectType) {
    const objectTypeList = list.map(item => item.object_type);
    const filteredObjectTypeList = objectTypeList.filter(objectTypeItem => objectTypeItem === objectType);
    const objectTypeQuantity = filteredObjectTypeList.length;
    if (objectTypeQuantity >= 5) {
      const lastIndexOfType = objectTypeList.lastIndexOf(objectType);
      list.splice(lastIndexOfType, 1);
    }
  }

  _getIndexOfItemInArray(list, id, objectType) {
    const filteredArray = list.map(item => (item.object_type === objectType ? item : { object_id: undefined }));
    const arrayOnlyWithIds = filteredArray.map(item => item.object_id);
    return arrayOnlyWithIds.indexOf(id);
  }

  _updateList(list, id, objectType) {
    const itemArrayIndex = this._getIndexOfItemInArray(list, id, objectType);
    const itemIsAlreadyOnTheList = itemArrayIndex !== -1;
    if (itemIsAlreadyOnTheList) list.splice(itemArrayIndex, 1);
    else this._removeMostOutdatedItemIfTypeLimit(list, objectType);
    list.unshift({ object_id: id, object_type: objectType });
    return list;
  }

  addToRecentsAtLocalStorage(id, objectType) {
    const currentList = localStorage.getItem("recents");
    if (!currentList) {
      localStorage.setItem("recents", JSON.stringify([{ object_id: id, object_type: objectType }]));
      return;
    }
    const parsedCurrentList = JSON.parse(currentList);
    const updatedList = this._updateList(parsedCurrentList, id, objectType);
    localStorage.setItem("recents", JSON.stringify(updatedList));
  }

  clearRecentsAtLocalStorage() {
    localStorage.removeItem("recents");
  }

  filterI(data, objectType) {
    const recentItems = localStorage.getItem("recents");
    if (!recentItems) return { ...data, results: [] };
    const parsedRecentItems = JSON.parse(recentItems);
    const parsedRecentItemsIds = parsedRecentItems
      .filter(item => item.object_type === objectType)
      .map(item => item.object_id);
    const userRecentItems = data.results.filter(item => parsedRecentItemsIds.includes(item.id));
    const sortedUserRecentItems = userRecentItems.sort((itemA, itemB) => {
      const indexOfAInRecentItems = parsedRecentItemsIds.indexOf(itemA.id);
      const indexOfBInRecentItems = parsedRecentItemsIds.indexOf(itemB.id);
      if (indexOfAInRecentItems > indexOfBInRecentItems) return 1;
      if (indexOfAInRecentItems < indexOfBInRecentItems) return -1;
      return 0;
    });
    return { ...data, results: sortedUserRecentItems };
  }
}
