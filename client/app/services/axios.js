import { pick } from "lodash";
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

function retryRequest(response, shouldRetry) {
  return shouldRetry ? axios.request(pick(response.config, ["method", "url", "data", "params"])) : response;
}

axios.interceptors.response.use(
  response => restoreSession(response).then(shouldRetry => retryRequest(response, shouldRetry)),
  error => {
    if (error.isAxiosError && error.response) {
      return restoreSession(error.response).then(shouldRetry => retryRequest(error.response, shouldRetry));
    }
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(response => {
  // When retrying request, sometimes this handler is executed twice sequentially on the same response.
  // Here we detect it the response is an original axios response object, and unwrap data only in that case.
  if (response.status && response.config && response.headers && response.request) {
    return response.data;
  }
  return response;
});

export const authRefreshInterceptor = createAuthRefreshInterceptor(
  axios,
  failedRequest => {
    const message = failedRequest.response.data.message || "";
    if (message.includes("CSRF")) {
      return axios.get("/ping");
    } else {
      return Promise.reject(failedRequest);
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
