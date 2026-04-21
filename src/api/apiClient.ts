import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { handleApiError } from '../services/errorHandler';
import { API_BASE_URL } from '../constants/config';

// ─── Известные коды ответа API ────────────────────────────────────────────────
/** Код 0 — стандартный успех */
const API_CODE_OK = 0;
/** Код 3 — успешный вход, в ответе присутствует объект member */
const API_CODE_LOGIN_WITH_MEMBER = 3;
/** Код 412 — требуется верификация (e.g. SMS), но данные участника уже есть */
const API_CODE_VERIFICATION_REQUIRED = 412;

const SUCCESS_CODES: ReadonlySet<number> = new Set([
  API_CODE_OK,
  API_CODE_LOGIN_WITH_MEMBER,
  200,
  201,
]);

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
});

api.interceptors.response.use(
  (response) => {
    const data = response.data;
    const code = data?.code !== undefined ? Number(data.code) : undefined;

    if (code !== undefined && !SUCCESS_CODES.has(code)) {
      // Особый случай: 412 с данными участника — пробрасываем вверх без алерта,
      // чтобы authService мог сам обработать этот ответ.
      if (code === API_CODE_VERIFICATION_REQUIRED && data?.member) return data;
      handleApiError(code, data.message);
      return Promise.reject(new Error(data.message || 'API Error'));
    }

    return data?.data !== undefined ? data.data : data;
  },
  (error: { response?: unknown }) => {
    if (!error.response) {
      handleApiError(-1, 'Нет соединения с сервером. Проверьте подключение к интернету.');
    }
    return Promise.reject(error);
  },
);

export const get = async <T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> =>
  api.get(url, { ...config, params });
export const post = async <T>(url: string, data?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> =>
  api.post(url, data, config);
export const put = async <T>(url: string, data?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> =>
  api.put(url, data, config);
export const del = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  api.delete(url, config);

export default api;
