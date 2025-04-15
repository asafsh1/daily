import axios from 'axios';
import { toast } from 'react-toastify';

// Get the API base URL from environment variables
const apiBaseUrl = process.env.REACT_APP_API_URL || 'https://daily-shipment-tracker.onrender.com';

if (!apiBaseUrl) {
  console.error('REACT_APP_API_URL is not defined in environment variables, using default');
}

console.log('Using API base URL:', apiBaseUrl);

// Track if we're currently getting a new token to avoid infinite loops
let isRefreshingToken = false;

// Function to get a new token
const getNewToken = async () => {
  isRefreshingToken = true;
  try {
    // Try GET method first
    try {
      const response = await axios.get(`${apiBaseUrl}/api/auth/get-dev-token`);
      if (response.data && response.data.token) {
        console.log('Got new token from GET endpoint');
        localStorage.setItem('token', response.data.token);
        return response.data.token;
      }
    } catch (getErr) {
      console.log('GET token failed, trying POST');
    }
    
    // Try POST method
    try {
      const response = await axios.post(`${apiBaseUrl}/api/auth/get-dev-token`);
      if (response.data && response.data.token) {
        console.log('Got new token from POST endpoint');
        localStorage.setItem('token', response.data.token);
        return response.data.token;
      }
    } catch (postErr) {
      console.log('POST token failed, trying public diagnostics');
    }
    
    // Try public diagnostics as last resort
    const diagResponse = await axios.get(`${apiBaseUrl}/api/public-diagnostics`);
    if (diagResponse.data && diagResponse.data.auth && diagResponse.data.auth.devToken) {
      console.log('Got new token from public diagnostics');
      localStorage.setItem('token', diagResponse.data.auth.devToken);
      return diagResponse.data.auth.devToken;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get new token:', error);
    return null;
  } finally {
    isRefreshingToken = false;
  }
};

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
    // Skip auth header for token endpoints
    if (config.url.includes('/get-dev-token') || config.url.includes('/public-diagnostics')) {
      return config;
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
      // Also use Authorization header as fallback
      config.headers['Authorization'] = `Bearer ${token}`;
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
  async (error) => {
    const originalRequest = error.config;
    
    // Prevent infinite retry loop
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // Try to get a new token on 401 errors
    if (error.response && error.response.status === 401 && !isRefreshingToken) {
      originalRequest._retry = true;
      
      const newToken = await getNewToken();
      
      if (newToken) {
        // Update request header with new token
        originalRequest.headers['x-auth-token'] = newToken;
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        
        // Retry the original request
        return instance(originalRequest);
      } else {
        console.error('Authentication error: Failed to get new token');
        toast.error('Authentication error: Please try refreshing the page');
      }
    }
    
    if (error.response) {
      // Handle specific error cases
      switch (error.response.status) {
        case 401:
          // Already handled above
          console.error('Authentication error: You need to be logged in');
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