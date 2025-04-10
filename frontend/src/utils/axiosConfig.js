import axios from 'axios';
import axiosRetry from 'axios-retry';

// Get environment and API URL
const isDevelopment = process.env.NODE_ENV !== 'production';
const apiBaseUrl = isDevelopment 
  ? (process.env.REACT_APP_API_URL || 'http://localhost:5001')
  : 'https://daily-shipment-tracker.onrender.com';

console.log('API Base URL:', apiBaseUrl);
console.log('Environment:', process.env.NODE_ENV || 'development');

// Create axios instance with base URL
const instance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000, // 30 seconds timeout for cloud deployments
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Enable sending cookies
});

// Track if we're currently trying to refresh the token
let isRefreshingToken = false;
let refreshPromise = null;
let currentToken = null;

// Add request interceptor
instance.interceptors.request.use(
  async config => {
    // If we have a current token, use it
    if (currentToken) {
      config.headers['x-auth-token'] = currentToken;
    }
    
    // Add timestamp to GET requests to prevent caching
    if (config.method === 'get' && !config.url.includes('timestamp=')) {
      const separator = config.url.includes('?') ? '&' : '?';
      config.url = `${config.url}${separator}timestamp=${new Date().getTime()}`;
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
  response => {
    // Check if we got a new token in the response
    const newToken = response.headers['x-auth-token'];
    if (newToken) {
      currentToken = newToken;
    }
    return response;
  },
  async error => {
    const originalRequest = error.config;
    
    // Only retry once
    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    
    if (error.response && error.response.status === 401) {
      console.error('[Axios Error] Authentication failed:', error.response.data);
      
      // Try to refresh token
      if (!originalRequest._retry && error.response.data.shouldRefresh) {
        originalRequest._retry = true;
        
        try {
          if (!isRefreshingToken) {
            isRefreshingToken = true;
            
            // Try to get a new token
            const response = await axios.post(`${apiBaseUrl}/api/auth/refresh`);
            
            if (response.data && response.data.token) {
              // Save the new token
              currentToken = response.data.token;
              
              // Retry the original request with the new token
              originalRequest.headers['x-auth-token'] = currentToken;
              isRefreshingToken = false;
              
              return instance(originalRequest);
            }
            
            isRefreshingToken = false;
          }
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError.message);
          isRefreshingToken = false;
          // Clear the current token if refresh failed
          currentToken = null;
        }
      }
    }
    
    // Handle database connection unavailable (503)
    if (error.response && error.response.status === 503) {
      console.error('[Axios Error] Database connection unavailable:', error.response.data);
      return Promise.reject(new Error('Database connection is currently unavailable. Please try again later.'));
    }
    
    if (error.request && !error.response) {
      // The request was made but no response was received
      console.error('[Axios Error] No response received', error.request);
      return Promise.reject(new Error('No response from server. Please try again later.'));
    }
    
    // Something happened in setting up the request that triggered an Error
    return Promise.reject(error);
  }
);

// Configure retry behavior
axiosRetry(instance, {
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 1000; // 1s, 2s, 3s
  },
  retryCondition: (error) => {
    // Only retry on network errors and 5xx server errors, not auth errors
    return (axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response && error.response.status >= 500)) &&
           !(error.response && error.response.status === 401);
  }
});

export default instance; 