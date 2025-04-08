import axiosInstance from './axiosConfig';

const setAuthToken = token => {
  if (token) {
    // Set token in the custom axios instance
    axiosInstance.defaults.headers.common['x-auth-token'] = token;
    
    // Also set in localStorage for persistence
    localStorage.setItem('token', token);
    
    console.log('Auth token set successfully');
  } else {
    // Remove token from axios instance
    delete axiosInstance.defaults.headers.common['x-auth-token'];
    
    // Remove from localStorage
    localStorage.removeItem('token');
    
    console.log('Auth token removed');
  }
};

export default setAuthToken; 