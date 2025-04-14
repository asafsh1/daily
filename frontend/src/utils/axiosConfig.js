import axios from 'axios';
import { toast } from 'react-toastify';

// Get the API base URL from environment variables
const apiBaseUrl = process.env.REACT_APP_API_URL;

if (!apiBaseUrl) {
  console.error('REACT_APP_API_URL is not defined in environment variables');
}

// Create axios instance with base URL and default config
const instance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific error cases
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 503:
          // Service Unavailable - likely database connection issue
          console.error('Database connection error:', error.response.data.msg);
          break;
        default:
          // Log other errors
          console.error('API Error:', error.response.data);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
    } else {
      // Error in request configuration
      console.error('Request configuration error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default instance; 