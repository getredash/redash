import axiosLib from "axios";
import { Auth } from "@/services/auth";

export const axios = axiosLib.create();

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
