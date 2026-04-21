import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { handleApiError } from '../services/errorHandler';
import { API_BASE_URL } from '../constants/config';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => {
    const data = response.data;

    const rawCode = data?.code;
    const code = rawCode !== undefined ? Number(rawCode) : undefined;

    const successCodes = [0, 200, 201, 3];

    if (code !== undefined && !successCodes.includes(code)) {
      if (code === 412 && data?.member) return data;
      handleApiError(code, data.message);
      return Promise.reject(new Error(data.message || 'API Error'));
    }

    return data?.data !== undefined ? data.data : data;
  },
  (error) => {
    if (!error.response) handleApiError(1);
    return Promise.reject(error);
  }
);

export const get = async <T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> => api.get(url, { ...config, params });
export const post = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => api.post(url, data, config);
export const put = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => api.put(url, data, config);
export const del = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => api.delete(url, config);
export default api;
