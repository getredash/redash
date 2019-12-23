import { $http } from "@/services/ng";

function processTags(data) {
  return data.tags || [];
}

export default function getTags(url) {
  return $http.get(url).then(response => processTags(response.data));
}
