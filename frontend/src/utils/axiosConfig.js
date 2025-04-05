import axios from 'axios';
import { toast } from 'react-toastify';

// Configure axios to use the backend URL from environment variables
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
console.log('Using API URL:', baseURL); 
axios.defaults.baseURL = baseURL;

// Set up request interceptor to add auth token to each request
axios.interceptors.request.use(
  config => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add it to headers
    if (token) {
      config.headers['x-auth-token'] = token;
    } else {
      // If no token found, add default headers as a fallback (for testing or dev)
      if (process.env.NODE_ENV !== 'production') {
        config.headers['x-auth-token'] = 'default-dev-token';
      }
    }
    
    console.log('Request headers:', config.headers);
    
    // Add timestamp to GET requests to prevent caching
    if (config.method === 'get' && !config.url.includes('timestamp=')) {
      const separator = config.url.includes('?') ? '&' : '?';
      config.url = `${config.url}${separator}timestamp=${new Date().getTime()}`;
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Set up response interceptor to handle errors
axios.interceptors.response.use(
  response => {
    // Log successful responses for debugging
    console.log(`Response from ${response.config.url}:`, response.status);
    return response;
  },
  error => {
    // Log the full error for debugging
    console.error('Axios Error:', error);
    
    if (error.response) {
      console.error('Response Error:', error.response.status, error.response.data);
      
      // Handle different error statuses
      if (error.response.status === 401) {
        // Handle unauthorized access
        toast.error('Authentication error. Please log in again.');
        localStorage.removeItem('token');
        // Only redirect to login in production to avoid disrupting development
        if (process.env.NODE_ENV === 'production') {
          window.location.href = '/login';
        }
      } else if (error.response.status === 404) {
        toast.error('Resource not found');
      } else if (error.response.status >= 500) {
        toast.error('Server error. Please try again later.');
      }
    } else if (error.request) {
      // Request was made but no response was received
      console.error('No response received:', error.request);
      toast.error('No response from server. Please check your connection.');
    } else {
      // Something else happened in setting up the request
      console.error('Request setup error:', error.message);
      toast.error('Error setting up request: ' + error.message);
    }
    
    return Promise.reject(error);
  }
);

// Import axios retry extension
// For now we'll implement this directly, should be added as a dependency later
const axiosRetry = (axios, options = {}) => {
  const maxRetries = options.retries || 3;
  const retryDelay = options.retryDelay || 1000;
  const shouldRetry = options.shouldRetry || ((error) => {
    return error.message === 'Network Error' || error.code === 'ERR_NETWORK';
  });

  axios.interceptors.response.use(null, async (error) => {
    const config = error.config;
    
    // Only retry if it meets our criteria and hasn't exceeded max retries
    if (shouldRetry(error) && (!config._retryCount || config._retryCount < maxRetries)) {
      config._retryCount = config._retryCount || 0;
      config._retryCount += 1;
      
      console.log(`Retrying request (${config._retryCount}/${maxRetries}): ${config.url}`);
      
      // Add a delay between retries with exponential backoff
      const delay = retryDelay * Math.pow(2, config._retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Return the retry request
      return axios(config);
    }
    
    // If we've exhausted retries or it's not a retryable error, continue with rejection
    return Promise.reject(error);
  });
};

// Apply retry logic to axios with custom settings
axiosRetry(axios, {
  retries: 2,
  retryDelay: 500,
  shouldRetry: (error) => {
    return (
      error.message === 'Network Error' || 
      error.code === 'ERR_NETWORK' || 
      (error.response && error.response.status >= 500)
    );
  }
});

export default axios; 