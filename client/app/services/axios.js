import { pick } from "lodash";
import axiosLib from "axios";
import { Auth } from "@/services/auth";
import qs from "query-string";
import Cookies from "js-cookie";
import { restoreSession } from "@/services/restoreSession";

export const axios = axiosLib.create({
  paramsSerializer: params => qs.stringify(params),
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

axios.interceptors.request.use(config => {
  const apiKey = Auth.getApiKey();
  if (apiKey) {
    config.headers.Authorization = `Key ${apiKey}`;
  }

  const csrfToken = Cookies.get("csrf_token");
  if (csrfToken) {
    config.headers.common["X-CSRF-TOKEN"] = csrfToken;
  }

  return config;
});
