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
  if (authCheckInProgress) return;
  
  try {
    authCheckInProgress = true;
    const res = await axios.get('/api/auth/verify');
    
    dispatch({
      type: USER_LOADED,
      payload: res.data
    });
  } catch (err) {
    console.log('Auth check failed:', err.message);
    dispatch({
      type: AUTH_ERROR
    });
  } finally {
    authCheckInProgress = false;
  }
};

// Login User
export const login = (email, password) => async dispatch => {
  try {
    const res = await axios.post('/api/auth/login', { email, password });

    dispatch({
      type: LOGIN_SUCCESS,
      payload: res.data
    });
  } catch (err) {
    const errors = err.response?.data?.errors;

    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, 'danger')));
    } else {
      dispatch(setAlert('Login failed. Please try again.', 'danger'));
    }

    dispatch({
      type: LOGIN_FAIL
    });
  }
};

// Logout
export const logout = () => async dispatch => {
  try {
    await axios.post('/api/auth/logout');
    dispatch({ type: CLEAR_PROFILE });
    dispatch({ type: LOGOUT });
  } catch (err) {
    console.error('Logout error:', err);
    dispatch(setAlert('Logout failed. Please try again.', 'danger'));
  }
}; 