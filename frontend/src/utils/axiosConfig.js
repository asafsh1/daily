import axios from 'axios';
import axiosRetry from 'axios-retry';

// Get environment and API URL
const isDevelopment = process.env.NODE_ENV !== 'production';
const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Create axios instance with base URL
const instance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000, // Increase timeout to 15 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Default credentials for development
const defaultCredentials = {
  email: 'admin@shipment.com',
  password: 'admin123'
};

// Flag to prevent multiple simultaneous login attempts
let isLoginInProgress = false;
let loginPromise = null;

// Direct login function
const performLogin = async () => {
  if (isLoginInProgress) {
    return loginPromise;
  }
  
  try {
    isLoginInProgress = true;
    loginPromise = (async () => {
      console.log('Attempting direct login with default credentials...');
      
      // Use axios directly instead of our configured instance to avoid circular dependencies
      const response = await axios.post(
        `${apiBaseUrl}/api/auth`, 
        defaultCredentials,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      if (response.data && response.data.token) {
        console.log('Login successful, received valid token');
        localStorage.setItem('token', response.data.token);
        return response.data.token;
      }
      
      return null;
    })();
    
    return await loginPromise;
  } catch (err) {
    console.error('Login failed:', err.message);
    return null;
  } finally {
    isLoginInProgress = false;
    loginPromise = null;
  }
};

// Get a valid token - either existing or new
const getValidToken = async () => {
  // Check if we already have a token
  const existingToken = localStorage.getItem('token');
  if (existingToken) {
    console.log('Using existing token from localStorage');
    return existingToken;
  }
  
  // If no token, try to login
  const token = await performLogin();
  return token;
};

// Track failed requests for retry
const failedRequestQueue = [];
let isRefreshing = false;

// Add request interceptor
instance.interceptors.request.use(
  async config => {
    // Add auth token to request if available
    const token = await getValidToken();
    
    if (token) {
      config.headers['x-auth-token'] = token;
    } else if (isDevelopment) {
      // In development, use a default token as fallback
      config.headers['x-auth-token'] = 'default-dev-token';
      console.log('Using default dev token');
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
  async error => {
    const originalRequest = error.config;
    
    // If we've already retried, don't retry again
    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    
    if (error.response && error.response.status === 401) {
      console.error(`[Axios Error] Status: ${error.response.status}`, error.response.data);
      
      // Only try to refresh token once
      originalRequest._retry = true;
      
      if (!isRefreshing) {
        isRefreshing = true;
        
        try {
          // Clear existing token
          localStorage.removeItem('token');
          
          // Try to get a new token
          const newToken = await performLogin();
          
          if (newToken) {
            // Update header with new token
            originalRequest.headers['x-auth-token'] = newToken;
            
            // Retry original request with new token
            return instance(originalRequest);
          }
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError.message);
        } finally {
          isRefreshing = false;
        }
      }
      
      // If we're still failing, use fallback data
      console.warn('Authentication error - using fallback data where available');
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
    // Only retry on network errors and 5xx server errors, not auth errors
    return (axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response && error.response.status >= 500)) &&
           !(error.response && error.response.status === 401);
  }
});

// Initialize by getting a valid token immediately
getValidToken();

export default instance; 