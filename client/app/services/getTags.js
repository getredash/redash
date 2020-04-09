import { axios } from "@/services/axios";

function processTags(data) {
  return data.tags || [];
}

export default function getTags(url) {
  return axios.get(url).then(processTags);
}
