import axios from 'axios';

const setAuthToken = token => {
  // Always bypass auth by not setting any token
  delete axios.defaults.headers.common['x-auth-token'];
};

export default setAuthToken; 