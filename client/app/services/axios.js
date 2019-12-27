import axios from "axios";

const axiosInstance = axios.create();

const getData = ({ data }) => data;
axiosInstance.interceptors.response.use(getData);

export default axiosInstance;
