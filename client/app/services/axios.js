import axiosLib from "axios";
import { Auth } from "@/services/auth";
import qs from "query-string";
import createAuthRefreshInterceptor from "axios-auth-refresh";

export const axios = axiosLib.create({
  paramsSerializer: params => qs.stringify(params),
  xsrfCookieName: "csrf_token",
  xsrfHeaderName: "X-CSRF-TOKEN",
});

const getData = ({ data }) => data;

axios.interceptors.response.use(getData);

export const authRefreshInterceptor = createAuthRefreshInterceptor(
  axios,
  failedRequest => {
    const message = failedRequest.response.data.message || "";
    if (message.includes("CSRF")) {
      return axios.get("/ping");
    } else {
      return Promise.reject();
    }
  },
  { statusCodes: [400] }
);

axios.interceptors.request.use(config => {
  const apiKey = Auth.getApiKey();
  if (apiKey) {
    config.headers.Authorization = `Key ${apiKey}`;
  }

  return config;
});
