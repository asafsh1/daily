import axios from 'axios';
import { toast } from 'react-toastify';

// Create axios instance with base URL
const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  timeout: 10000, // Increase timeout to 10 seconds
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
    
    console.log(`[Axios Request] ${config.method.toUpperCase()} ${config.url}`);
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
    console.log(`[Axios Response] ${response.config.method.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`[Axios Error] Status: ${error.response.status}`, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('[Axios Error] No response received', error.request);
      
      // Create a more user-friendly error
      return Promise.reject({
        response: {
          status: 0,
          data: {
            message: 'No response from server. Please check your connection.'
          }
        }
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('[Axios Error] Request setup failed', error.message);
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
axiosRetry(instance, {
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

export default instance; 