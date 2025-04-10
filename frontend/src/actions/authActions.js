import axios from '../utils/axiosConfig';
import { setAlert } from './alert';
import {
  USER_LOADED,
  AUTH_ERROR,
  LOGIN_SUCCESS,
  LOGIN_FAIL,
  LOGOUT,
  CLEAR_PROFILE
} from './types';

let authCheckInProgress = false;

// Set user data
export const setUser = (userData) => ({
  type: USER_LOADED,
  payload: userData
});

// Load User
export const loadUser = () => async dispatch => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      dispatch({ type: AUTH_ERROR });
      return;
    }

    const res = await axios.get('/api/auth/verify');
    dispatch({
      type: USER_LOADED,
      payload: res.data
    });
  } catch (err) {
    console.error('Auth check failed:', err.message);
    localStorage.removeItem('token');
    dispatch({ type: AUTH_ERROR });
  }
};

// Login User
export const login = (email, password) => async dispatch => {
  try {
    const res = await axios.post('/api/auth/login', { email, password });
    
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }

    dispatch({
      type: LOGIN_SUCCESS,
      payload: res.data
    });

    dispatch(loadUser());
  } catch (err) {
    localStorage.removeItem('token');
    
    const errors = err.response?.data?.errors;
    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, 'danger')));
    } else {
      dispatch(setAlert('Login failed. Please try again.', 'danger'));
    }

    dispatch({ type: LOGIN_FAIL });
  }
};

// Logout
export const logout = () => async dispatch => {
  try {
    await axios.post('/api/auth/logout');
  } catch (err) {
    console.error('Logout error:', err);
  }
  
  localStorage.removeItem('token');
  dispatch({ type: CLEAR_PROFILE });
  dispatch({ type: LOGOUT });
}; 