import axios from 'axios';

// Configure axios to use the backend URL from environment variables
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
console.log('Using API URL:', baseURL); // Add logging to debug
axios.defaults.baseURL = baseURL;

// Remove any existing auth headers
delete axios.defaults.headers.common['x-auth-token'];

export default axios; 