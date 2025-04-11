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

// Add request interceptor to add auth token
instance.interceptors.request.use(
  async config => {
    let token = localStorage.getItem('token');
    
    // If no token exists, try to get a dev token
    if (!token) {
      try {
        const response = await axios.post(`${apiBaseUrl}/api/get-dev-token`);
        token = response.data.token;
        localStorage.setItem('token', token);
      } catch (err) {
        console.error('Failed to get dev token:', err);
      }
    }

    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor
instance.interceptors.response.use(
  response => response,
  async error => {
    if (error.response) {
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        console.error('[Auth Error]', error.response.data);
        // Clear token if it's invalid
        localStorage.removeItem('token');
        // Try to get a new dev token
        try {
          const response = await axios.post(`${apiBaseUrl}/api/get-dev-token`);
          const newToken = response.data.token;
          localStorage.setItem('token', newToken);
          // Retry the original request with the new token
          const originalRequest = error.config;
          originalRequest.headers['x-auth-token'] = newToken;
          return axios(originalRequest);
        } catch (err) {
          console.error('Failed to refresh token:', err);
          return Promise.reject(new Error('Authentication failed'));
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
      toast.error('Network error. Please check your connection.');
      return Promise.reject(new Error('Network error occurred'));
    }

    return Promise.reject(error);
  }
);

export default instance; 