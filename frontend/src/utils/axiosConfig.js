import axios from 'axios';
import axiosRetry from 'axios-retry';

// Get environment
const isDevelopment = process.env.NODE_ENV !== 'production';

// Create axios instance with base URL
const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
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

// Automatically login and get a valid token in development
const autoLogin = async () => {
  try {
    // Only in development mode
    if (!isDevelopment) return null;
    
    console.log('Auto-login: Attempting to get valid token...');
    
    // Use the default credentials to get a token
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth`, 
      defaultCredentials
    );
    
    if (response.data && response.data.token) {
      console.log('Auto-login: Successfully obtained valid token');
      localStorage.setItem('token', response.data.token);
      return response.data.token;
    }
    
    return null;
  } catch (err) {
    console.error('Auto-login failed:', err.message);
    return null;
  }
};

// Ensure we have a valid token
let isAutoLoginInProgress = false;
const ensureValidToken = async () => {
  if (isAutoLoginInProgress) {
    // Wait for the existing auto-login to complete
    while (isAutoLoginInProgress) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return localStorage.getItem('token');
  }
  
  try {
    isAutoLoginInProgress = true;
    
    // Check if we already have a token
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      console.log('Using existing token from localStorage');
      return existingToken;
    }
    
    // If no token, get one through auto-login
    const newToken = await autoLogin();
    return newToken;
  } finally {
    isAutoLoginInProgress = false;
  }
};

// Add request interceptor
instance.interceptors.request.use(
  async config => {
    // Ensure we have a valid token before making the request
    const token = await ensureValidToken();
    
    if (token) {
      config.headers['x-auth-token'] = token;
    } else if (isDevelopment) {
      // In development, use a default token as fallback
      config.headers['x-auth-token'] = 'default-dev-token';
      console.log('Using default dev token');
    }
    
    // Add timestamp to GET requests to prevent caching instead of using cache-control headers
    // This avoids CORS preflight issues with complex headers
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
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`[Axios Error] Status: ${error.response.status}`, error.response.data);
      
      // If unauthorized and in development, try to get a new token
      if (error.response.status === 401 && isDevelopment) {
        console.warn('Authentication error - using fallback data where available');
        
        // Clear the token to force a new login next time
        localStorage.removeItem('token');
        
        // Try to login automatically to get a fresh token
        const newToken = await autoLogin();
        
        if (newToken) {
          // Retry the original request with the new token
          const originalRequest = error.config;
          originalRequest.headers['x-auth-token'] = newToken;
          
          try {
            return await axios(originalRequest);
          } catch (retryError) {
            console.error('Retry with new token failed:', retryError.message);
          }
        }
      }
      
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

// Initialize by trying to get a valid token
ensureValidToken();

export default instance; 