import {
  REGISTER_SUCCESS,
  REGISTER_FAIL,
  USER_LOADED,
  AUTH_ERROR,
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  LOGOUT
} from '../actions/types';

const initialState = {
  token: null,
  isAuthenticated: true,
  loading: false,
  user: {
    id: 'default-user',
    name: 'User',
    role: 'admin'
  }
};

// Always return authenticated state
const authReducer = () => initialState;

export default authReducer; 