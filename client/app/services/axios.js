import axiosLib from "axios";
import { Auth } from "@/services/auth";
import qs from "query-string";

export const axios = axiosLib.create({
  paramsSerializer: params => qs.stringify(params),
});

const getData = ({ data }) => data;
const getResponse = ({ response }) => Promise.reject(response);

axios.interceptors.response.use(getData, getResponse);

axios.interceptors.request.use(config => {
  const apiKey = Auth.getApiKey();
  if (apiKey) {
    config.headers.Authorization = `Key ${apiKey}`;
  }

  return config;
});
