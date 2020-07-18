import axiosLib from "axios";
import { Auth } from "@/services/auth";
import qs from "query-string";
import Cookies from 'js-cookie'

export const axios = axiosLib.create({
  paramsSerializer: params => qs.stringify(params),
});

axios.defaults.headers.common['X-CSRF-TOKEN'] = Cookies.get('csrf_token');

const getData = ({ data }) => data;

axios.interceptors.response.use(getData);

axios.interceptors.request.use(config => {
  const apiKey = Auth.getApiKey();
  if (apiKey) {
    config.headers.Authorization = `Key ${apiKey}`;
  }

  return config;
});
