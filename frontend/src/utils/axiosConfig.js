import axios from 'axios';

// Configure axios to use the backend URL explicitly
axios.defaults.baseURL = 'http://localhost:5001';

// Remove any existing auth headers
delete axios.defaults.headers.common['x-auth-token'];

export default axios; 