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

// Track if we're currently trying to refresh the token
let isRefreshingToken = false;
let refreshPromise = null;

// Add request interceptor
instance.interceptors.request.use(
  async config => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (token) {
      console.log('Using existing token from localStorage');
      config.headers['x-auth-token'] = token;
    } else {
      // If no token, try to get one from the server using dev auth endpoint
      try {
        if (!isRefreshingToken) {
          isRefreshingToken = true;
          refreshPromise = (async () => {
            try {
              // Use the special dev token endpoint
              const response = await axios.post(`${apiBaseUrl}/api/get-dev-token`);
              
              if (response.data && response.data.token) {
                console.log('Obtained developer token from server');
                localStorage.setItem('token', response.data.token);
                return response.data.token;
              }
              return null;
            } catch (err) {
              console.error('Failed to get developer token:', err.message);
              return null;
            } finally {
              isRefreshingToken = false;
            }
          })();
        }
        
        const newToken = await refreshPromise;
        refreshPromise = null;
        
        if (newToken) {
          config.headers['x-auth-token'] = newToken;
        }
      } catch (err) {
        console.error('Error getting token:', err.message);
      }
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
    
    // Only retry once
    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    
    if (error.response && error.response.status === 401) {
      console.error('[Axios Error] Authentication failed:', error.response.data);
      
      // Try to refresh token
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        
        // Clear existing token
        localStorage.removeItem('token');
        
        // Try to get a new token from dev token endpoint
        try {
          if (!isRefreshingToken) {
            isRefreshingToken = true;
            
            const response = await axios.post(`${apiBaseUrl}/api/get-dev-token`);
            
            if (response.data && response.data.token) {
              // Save the new token
              const newToken = response.data.token;
              localStorage.setItem('token', newToken);
              
              // Retry the original request with the new token
              originalRequest.headers['x-auth-token'] = newToken;
              isRefreshingToken = false;
              
              return instance(originalRequest);
            }
            
            isRefreshingToken = false;
          }
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError.message);
          isRefreshingToken = false;
        }
      }
    }
    
    // Handle database connection unavailable (503)
    if (error.response && error.response.status === 503) {
      console.error('[Axios Error] Database connection unavailable:', error.response.data);
      
      // Create a user-friendly error message for database connection issues
      const customError = new Error('Database connection is currently unavailable. Please try again later.');
      customError.isDatabaseError = true;
      customError.originalError = error.response.data;
      return Promise.reject(customError);
    }
    
    if (error.request && !error.response) {
      // The request was made but no response was received
      console.error('[Axios Error] No response received', error.request);
      
      // Create a more user-friendly error message
      const customError = new Error('No response from server. Please check your connection.');
      customError.isNetworkError = true;
      return Promise.reject(customError);
    }
    
    // Something happened in setting up the request that triggered an Error
    return Promise.reject(error);
  }
);

// Configure retry behavior
axiosRetry(instance, {
  retries: 2,
  retryDelay: (retryCount) => {
    return retryCount * 1000; // 1s, 2s
  },
  retryCondition: (error) => {
    // Only retry on network errors and 5xx server errors, not auth errors
    return (axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response && error.response.status >= 500)) &&
           !(error.response && error.response.status === 401);
  }
});

// Try to initialize token on load
const initToken = async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    try {
      // Try to get a token using the dev endpoint
      const response = await axios.post(`${apiBaseUrl}/api/get-dev-token`);
      
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        console.log('Initialized token on load');
      }
    } catch (err) {
      console.error('Failed to initialize token:', err.message);
    }
  }
};

// Initialize token
initToken();

export default instance; 