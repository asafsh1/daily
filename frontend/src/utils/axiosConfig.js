import axios from 'axios';
import { toast } from 'react-toastify';

// Get the API base URL from environment variable
const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
console.log('API Base URL:', apiBaseUrl);
console.log('Environment:', process.env.NODE_ENV);

// Create axios instance with base URL
const instance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
instance.interceptors.request.use(
  async config => {
    // Add timestamp to prevent caching
    if (config.method === 'get') {
      const separator = config.url.includes('?') ? '&' : '?';
      config.url = `${config.url}${separator}timestamp=${Date.now()}`;
    }
    return config;
  },
  error => {
    console.error('[Axios Request Error]', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
instance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response) {
      // Handle 401 Unauthorized
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Try to refresh the session
          await axios.post(`${apiBaseUrl}/api/auth/refresh`, {}, {
            withCredentials: true
          });
          
          // Retry the original request
          return instance(originalRequest);
        } catch (refreshError) {
          // If refresh fails, redirect to login
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      // Handle 500 Server Error
      if (error.response.status === 500) {
        console.error('[Server Error]', error.response.data);
        toast.error('Server error occurred. Please try again later.');
        return Promise.reject(new Error('Server error occurred'));
      }

      return Promise.reject(error);
    }

    // Handle network errors
    if (error.request && !error.response) {
      console.error('[Network Error] No response received:', error.request);
      return Promise.reject(new Error('No response from server. Please try again later.'));
    }

    return Promise.reject(error);
  }
);

export default instance; 