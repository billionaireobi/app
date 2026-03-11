import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// In development (Expo Go), connect to the local Django dev server running on your PC.
// In production (APK build), connect to the live server.
// Run the dev server with: python manage.py runserver 0.0.0.0:8000
export const BASE_URL = __DEV__
  ? 'http://192.168.100.147:8000/api/'
  : 'https://zeliaoms.mcdave.co.ke/api/';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach token to every request
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Normalize error responses — extract readable message from Django DRF errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<Record<string, unknown>>) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync('auth_token');
    }

    if (error.response?.data) {
      const d = error.response.data;
      const msg =
        (d.detail as string) ||
        (d.error as string) ||
        (d.message as string) ||
        (Array.isArray(d.non_field_errors) ? (d.non_field_errors as string[])[0] : undefined) ||
        extractFirstFieldError(d) ||
        `Server error (${error.response.status})`;
      const enhanced = new Error(msg) as Error & { status: number; data: unknown };
      enhanced.status = error.response.status;
      enhanced.data = d;
      return Promise.reject(enhanced);
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return Promise.reject(new Error('Request timed out. Check your connection.'));
    }

    if (!error.response) {
      return Promise.reject(new Error('No internet connection.'));
    }

    return Promise.reject(error);
  },
);

function extractFirstFieldError(data: Record<string, unknown>): string | undefined {
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (Array.isArray(val) && typeof val[0] === 'string') {
      return `${key}: ${val[0]}`;
    }
    if (typeof val === 'string') return `${key}: ${val}`;
  }
  return undefined;
}

export default apiClient;
