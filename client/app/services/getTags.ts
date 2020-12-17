import { axios } from "@/services/axios";

function processTags(data: any) {
  return data.tags || [];
}

export default function getTags(url: any) {
  return axios.get(url).then(processTags);
}
