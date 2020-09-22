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
    const message = error.response.data.message || "";
    if (message.includes("CSRF")) {
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
    if (error.isAxiosError && error.response) {
      return restoreSession(error.response);
    }
    return Promise.reject(error);
  },
  { statusCodes: [401, 404] }
);

axios.interceptors.request.use(config => {
  const apiKey = Auth.getApiKey();
  if (apiKey) {
    config.headers.Authorization = `Key ${apiKey}`;
  }

  return config;
});
