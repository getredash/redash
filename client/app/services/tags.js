import { $http } from '@/services/http';

function processTags(data) {
  return data.tags || [];
}

export function getTags(url) {
  return $http.get(url).then(response => processTags(response.data));
}

// Need a default function, that will be used by the auto register mechanism.
export default function () {}
