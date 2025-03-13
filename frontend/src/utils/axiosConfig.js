import axios from 'axios';

// Configure axios to use the backend URL from environment variables or fallback to localhost
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Remove any existing auth headers
delete axios.defaults.headers.common['x-auth-token'];

export default axios; 