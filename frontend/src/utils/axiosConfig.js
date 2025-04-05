import axios from 'axios';
import axiosRetry from 'axios-retry';

// Create axios instance with base URL
const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  timeout: 15000, // Increase timeout to 15 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
instance.interceptors.request.use(
  config => {
    // Add auth token to request if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
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
    return response;
  },
  error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`[Axios Error] Status: ${error.response.status}`, error.response.data);
      return Promise.reject(error);
    } 
    
    if (error.request) {
      // The request was made but no response was received
      console.error('[Axios Error] No response received', error.request);
      
      // Create a more user-friendly error message
      const customError = new Error('No response from server. Please check your connection.');
      customError.isNetworkError = true;
      customError.response = {
        status: 0,
        data: {
          message: 'No response from server. Please check your connection.'
        }
      };
      return Promise.reject(customError);
    } 
    
    // Something happened in setting up the request that triggered an Error
    console.error('[Axios Error] Request setup failed', error.message);
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
    // Retry on network errors and 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response && error.response.status >= 500);
  }
});

export default instance; 