import axios from "axios";

const axiosInstance = axios.create();

const getData = ({ data }) => data;
const getResponse = ({ response }) => Promise.reject(response);
axiosInstance.interceptors.response.use(getData, getResponse);

export default axiosInstance;
