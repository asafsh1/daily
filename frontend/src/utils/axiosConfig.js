import axios from 'axios';

// Configure axios to use the backend URL from environment variables
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
console.log('Using API URL:', baseURL); // Add logging to debug
axios.defaults.baseURL = baseURL;

// Set up request interceptor to add auth token to each request
axios.interceptors.request.use(
  config => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add it to headers
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Set up response interceptor to handle errors
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axios; 