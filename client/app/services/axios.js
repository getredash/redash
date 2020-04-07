import axiosLib from "axios";
import { Auth } from "@/services/auth";
import qs from "query-string";

export const axios = axiosLib.create({
  paramsSerializer: params => qs.stringify(params),
});

const getData = ({ data }) => data;

axios.interceptors.response.use(getData);

axios.interceptors.request.use(config => {
  const apiKey = Auth.getApiKey();
  if (apiKey) {
    config.headers.Authorization = `Key ${apiKey}`;
  }

  return config;
});
