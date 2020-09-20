// eslint-disable-next-line import/prefer-default-export
export function absoluteUrl(url) {
  const urlObj = new URL(url, window.location);
  urlObj.protocol = window.location.protocol;
  urlObj.host = window.location.host;
  return urlObj.toString();
}

export function filterRecent(data, objectType) {
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
