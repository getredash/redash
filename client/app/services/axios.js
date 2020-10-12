import { get, includes } from "lodash";
import axiosLib from "axios";
import createAuthRefreshInterceptor from "axios-auth-refresh";
import { Auth } from "@/services/auth";
import qs from "query-string";
import { restoreSession } from "@/services/restoreSession";

export const axios = axiosLib.create({
  paramsSerializer: params => qs.stringify(params),
  xsrfCookieName: "csrf_token",
  xsrfHeaderName: "X-CSRF-TOKEN",
});

axios.interceptors.response.use(response => response.data);

export const csrfRefreshInterceptor = createAuthRefreshInterceptor(
  axios,
  error => {
    const message = get(error, "response.data.message");
    if (error.isAxiosError && includes(message, "CSRF")) {
      return axios.get("/ping");
    } else {
      return Promise.reject(error);
    }
  },
  { statusCodes: [400] }
);

export const sessionRefreshInterceptor = createAuthRefreshInterceptor(
  axios,
  error => {
    const status = parseInt(get(error, "response.status"));
    const message = get(error, "response.data.message");
    // TODO: In axios@0.9.1 this check could be replaced with { skipAuthRefresh: true } flag. See axios-auth-refresh docs
    const requestUrl = get(error, "config.url");
    if (error.isAxiosError && (status === 401 || includes(message, "Please login")) && requestUrl !== "api/session") {
      return restoreSession();
    }
    return Promise.reject(error);
  },
  {
    statusCodes: [401, 404],
    pauseInstanceWhileRefreshing: false, // According to docs, `false` is default value, but in fact it's not :-)
  }
);

axios.interceptors.request.use(config => {
  const apiKey = Auth.getApiKey();
  if (apiKey) {
    config.headers.Authorization = `Key ${apiKey}`;
  }

  return config;
});
