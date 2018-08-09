import { map, sortBy } from 'lodash';
import { $http } from '@/services/http';

function processTags(tags) {
  tags = tags || {};
  return map(sortBy(map(tags, (count, tag) => ({ tag, count })), 'count'), item => item.tag);
}

export function getTags(url) {
  return $http.get(url).then(response => processTags(response.data));
}

// Need a default function, that will be used by the auto register mechanism.
export default function () {}
