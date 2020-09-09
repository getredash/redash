// eslint-disable-next-line import/prefer-default-export
export function absoluteUrl(url) {
  const urlObj = new URL(url, window.location);
  urlObj.protocol = window.location.protocol;
  urlObj.host = window.location.host;
  return urlObj.toString();
}

export function filterRecent(data, recentStorage) {
  const recentItems = localStorage.getItem(recentStorage);
  if (!recentItems) return { ...data, results: [] };
  const parsedRecentItems = JSON.parse(recentItems);
  const userRecentItems = data.results.filter(item => parsedRecentItems.includes(item.id));
  const sortedUserRecentItems = userRecentItems.sort((itemA, itemB) => {
    const indexOfAInRecentItems = parsedRecentItems.indexOf(itemA.id);
    const indexOfBInRecentItems = parsedRecentItems.indexOf(itemB.id);
    if(indexOfAInRecentItems > indexOfBInRecentItems) return 1;
    if(indexOfAInRecentItems < indexOfBInRecentItems) return -1;
    return 0;
  })
  return { ...data, results: sortedUserRecentItems };
};
